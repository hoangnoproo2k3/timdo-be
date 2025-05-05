import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { envConfig } from '~/common/config/env.config';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
} from '~/common/utils';
import { PrismaService } from '~/prisma';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly MAX_TOKENS_PER_USER: number;
  private readonly REFRESH_EXPIRES_IN_DAYS: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.MAX_TOKENS_PER_USER = envConfig.maxRefreshTokensPerUser;
    this.REFRESH_EXPIRES_IN_DAYS = envConfig.refreshTokenExpiresInDays;
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, username } = signUpDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await hashPassword(password);
    const finalUsername =
      username?.trim() ||
      email.split('@')[0].split('.')[0] ||
      email.split('@')[0];

    if (existingUser) {
      // If user previously registered with Google but has no password,
      // allow setting a password and reuse the account.
      if (existingUser.googleId && !existingUser.password) {
        const updatedUser = await this.prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword,
            username: existingUser.username ?? finalUsername,
          },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            createdAt: true,
            password: true,
            googleId: true,
            avatarUrl: true,
            updatedAt: true,
          },
        });

        const accessToken = generateAccessToken(this.jwtService, {
          sub: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        });

        const refreshToken = generateRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.REFRESH_EXPIRES_IN_DAYS);

        await this.prisma.refreshToken.create({
          data: {
            token: refreshToken,
            userId: updatedUser.id,
            expiresAt,
          },
        });

        return { user: updatedUser, accessToken, refreshToken };
      }

      // User already exists with password → cannot register again
      throw new ConflictException('Email already exists');
    }

    // New user registration
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: finalUsername,
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        password: true,
        googleId: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    const accessToken = generateAccessToken(this.jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_EXPIRES_IN_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user, accessToken, refreshToken };
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    // Google-only account cannot login with password
    if (!user.password) {
      throw new BadRequestException(
        'This account is linked to Google. Please use Google login.',
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    return this.createSession(user);
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    username: string;
  }) {
    try {
      let user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!user) {
        // First time login with Google
        user = await this.prisma.user.create({
          data: {
            email: googleUser.email,
            googleId: googleUser.googleId,
            username: googleUser.username,
            role: 'USER',
          },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            createdAt: true,
            password: true,
            googleId: true,
            avatarUrl: true,
            updatedAt: true,
          },
        });
      } else if (!user.googleId) {
        // Link Google account to an existing user
        user = await this.prisma.user.update({
          where: { email: googleUser.email },
          data: { googleId: googleUser.googleId },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            createdAt: true,
            password: true,
            googleId: true,
            avatarUrl: true,
            updatedAt: true,
          },
        });
      }

      return this.createSession(user);
    } catch (error) {
      console.error('Google login error:', error);
      throw new InternalServerErrorException('Google login failed');
    }
  }

  private async createSession(user: {
    id: number;
    email: string;
    username: string | null;
    role: string;
    createdAt: Date;
  }) {
    const accessToken = generateAccessToken(this.jwtService, {
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_EXPIRES_IN_DAYS);

    try {
      await this.prisma.$transaction(async (tx) => {
        const tokenCount = await tx.refreshToken.count({
          where: { userId: user.id },
        });

        // Enforce maximum number of refresh tokens per user
        if (tokenCount >= this.MAX_TOKENS_PER_USER) {
          const tokensToDelete = await tx.refreshToken.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'asc' },
            take: tokenCount - this.MAX_TOKENS_PER_USER + 1,
          });
          await tx.refreshToken.deleteMany({
            where: { id: { in: tokensToDelete.map((t) => t.id) } },
          });
        }

        await tx.refreshToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            expiresAt,
          },
        });
      });
    } catch (error) {
      console.error('Session creation error:', error);
      throw new InternalServerErrorException('Failed to create session');
    }

    return { user, accessToken, refreshToken };
  }

  async refreshToken(oldRefreshToken: string) {
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { id: existingToken.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    await this.prisma.refreshToken.delete({
      where: { id: existingToken.id },
    });

    return this.createSession(existingToken.user);
  }

  async logout(refreshToken: string, logoutFromAllDevices = false) {
    try {
      if (logoutFromAllDevices) {
        const currentToken = await this.prisma.refreshToken.findUnique({
          where: { token: refreshToken },
          select: { userId: true },
        });

        if (currentToken) {
          // Delete all refresh tokens for this user
          await this.prisma.refreshToken.deleteMany({
            where: { userId: currentToken.userId },
          });
        }
      } else {
        // Logout from current device only
        await this.prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error if token doesn't exist
    }
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        googleId: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }
}
