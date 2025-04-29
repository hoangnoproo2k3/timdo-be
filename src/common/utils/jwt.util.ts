import { JwtService } from '@nestjs/jwt';
import { envConfig } from '../config/env.config';

export function generateAccessToken(
  jwtService: JwtService,
  payload: { sub: number; email: string; role: string },
): string {
  return jwtService.sign(payload, {
    secret: envConfig.jwtSecret,
    expiresIn: envConfig.jwtExpiresIn,
  });
}
