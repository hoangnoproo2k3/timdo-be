import { ConfigService } from '@nestjs/config';

export interface EnvConfig {
  nodeEnv: string;
  databaseUrl: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresInDays: number;
  maxRefreshTokensPerUser: number;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  loginRedirectUrl: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;
  CLOUDFRONT_URL: string;
}

const configService = new ConfigService();

const envConfig: EnvConfig = {
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

  AWS_ACCESS_KEY_ID: configService.get<string>('AWS_ACCESS_KEY_ID') || '',
  AWS_SECRET_ACCESS_KEY:
    configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
  AWS_REGION: configService.get<string>('AWS_REGION') || '',
  AWS_S3_BUCKET: configService.get<string>('AWS_S3_BUCKET') || '',
  CLOUDFRONT_URL: configService.get<string>('CLOUDFRONT_URL') || '',
};

// Validate required environment variables
const requiredEnvVars: (keyof EnvConfig)[] = [
  'databaseUrl',
  'jwtSecret',
  'googleClientId',
  'googleClientSecret',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'CLOUDFRONT_URL',
];

requiredEnvVars.forEach((key) => {
  if (!envConfig[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export { envConfig };
