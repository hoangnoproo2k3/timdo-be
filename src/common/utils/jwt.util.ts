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
