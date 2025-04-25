import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { envConfig } from '~/common/config/env.config';
import { PrismaService } from '~/prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'google' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const jwtSecret = envConfig.jwtSecret;
        if (!jwtSecret) {
          throw new Error('Missing JWT_SECRET environment variable');
        }
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: envConfig.jwtExpiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, GoogleStrategy, GoogleAuthGuard],
})
export class AuthModule {}
