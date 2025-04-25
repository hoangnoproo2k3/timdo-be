import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { comparePassword, hashPassword } from '~/common/utils/bcrypt.util';
import { generateRefreshToken } from '~/common/utils/crypto.util';
import {
  generateAccessToken,
  getMaxTokenPerUser,
  getRefreshTokenMaxAge,
} from '~/common/utils/jwt.util';
import { PrismaService } from '~/prisma/prisma.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  private readonly MAX_TOKENS_PER_USER: number;
  private readonly REFRESH_EXPIRES_IN_DAYS: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.MAX_TOKENS_PER_USER = getMaxTokenPerUser(this.configService);
    this.REFRESH_EXPIRES_IN_DAYS = getRefreshTokenMaxAge(this.configService);
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, username } = signUpDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await hashPassword(password);

    let finalUsername = username?.trim();
    if (!finalUsername) {
      const emailLocalPart = email.split('@')[0];
      finalUsername = emailLocalPart.split('.')[0] || emailLocalPart;
    }

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

    const accessToken = generateAccessToken(
      this.jwtService,
      this.configService,
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
    );

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
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account is linked to Google. Please use Google login.',
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
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
        // Cập nhật googleId nếu người dùng đã tồn tại
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
    const accessToken = generateAccessToken(
      this.jwtService,
      this.configService,
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
    );
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_EXPIRES_IN_DAYS);

    try {
      await this.prisma.$transaction(async (tx) => {
        const tokenCount = await tx.refreshToken.count({
          where: { userId: user.id },
        });

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
}
