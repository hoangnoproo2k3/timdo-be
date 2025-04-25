import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export function generateAccessToken(
  jwtService: JwtService,
  configService: ConfigService,
  payload: { sub: number; email: string; role: string },
): string {
  return jwtService.sign(payload, {
    secret: configService.get<string>('JWT_SECRET'),
    expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
  });
}

export function getRefreshTokenMaxAge(configService: ConfigService): number {
  const days = configService.get<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS', 7);
  return days;
}

export function getMaxTokenPerUser(configService: ConfigService): number {
  const days = configService.get<number>('MAX_REFRESH_TOKENS_PER_USER', 3);
  return days;
}
