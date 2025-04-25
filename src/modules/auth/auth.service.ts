import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hashPassword } from '~/common/utils/bcrypt.util';
import { generateRefreshToken } from '~/common/utils/crypto.util';
import { generateAccessToken } from '~/common/utils/jwt.util';
import { PrismaService } from '~/prisma/prisma.service';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

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
    expiresAt.setDate(
      expiresAt.getDate() +
        this.configService.get<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS', 7),
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user, accessToken, refreshToken };
  }
}
