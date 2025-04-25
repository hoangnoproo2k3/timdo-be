import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

interface GoogleProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string; verified: boolean }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });

    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      const missingVars = [
        !clientID && 'GOOGLE_CLIENT_ID',
        !clientSecret && 'GOOGLE_CLIENT_SECRET',
        !callbackURL && 'GOOGLE_CALLBACK_URL',
      ]
        .filter(Boolean)
        .join(', ');
      const errorMsg = `Missing environment variables: ${missingVars}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.logger.log(
      `GoogleStrategy initialized with clientID: ${clientID.slice(0, 10)}...`,
    );
  }

  validate(accessToken: string, refreshToken: string, profile: GoogleProfile) {
    this.logger.log('Validating Google profile');
    try {
      if (!profile) {
        this.logger.error('No profile data from Google');
        throw new UnauthorizedException('No profile data from Google');
      }
      if (!profile.emails || !profile.emails.length) {
        this.logger.error('No email provided by Google');
        throw new UnauthorizedException('No email provided by Google');
      }
      if (!profile.id) {
        this.logger.error('No Google ID provided');
        throw new UnauthorizedException('No Google ID provided');
      }
      const result = {
        googleId: profile.id,
        email: profile.emails[0].value,
        username: profile.displayName || profile.emails[0].value.split('@')[0],
      };
      this.logger.log(`Google user validated: ${result.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Google validation failed: ${error}`);
      throw error;
    }
  }
}
