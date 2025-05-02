import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { envConfig } from '~/common/config/env.config';

interface GoogleProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string; verified: boolean }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor() {
    super({
      clientID: envConfig.googleClientId,
      clientSecret: envConfig.googleClientSecret,
      callbackURL: envConfig.googleCallbackUrl,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });

    const clientID = envConfig.googleClientId;
    const clientSecret = envConfig.googleClientSecret;
    const callbackURL = envConfig.googleCallbackUrl;

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
