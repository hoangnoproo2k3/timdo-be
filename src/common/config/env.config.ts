import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export const envConfig = {
  nodeEnv: configService.get<string>('NODE_ENV') || 'development',
  databaseUrl: configService.get<string>('DATABASE_URL') || '',
  port: configService.get<number>('PORT') || 3000,

  jwtSecret: configService.get<string>('JWT_SECRET') || '',
  jwtExpiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
  refreshTokenExpiresInDays:
    configService.get<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS') || 7,
  maxRefreshTokensPerUser:
    configService.get<number>('MAX_REFRESH_TOKENS_PER_USER') || 3,

  googleClientId: configService.get<string>('GOOGLE_CLIENT_ID') || '',
  googleClientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
  googleCallbackUrl:
    configService.get<string>('GOOGLE_CALLBACK_URL') ||
    'http://localhost:2026/api/v1/auth/google/callback',
  loginRedirectUrl:
    configService.get<string>('LOGIN_REDIRECT_URL') || 'http://localhost:3000',
};
