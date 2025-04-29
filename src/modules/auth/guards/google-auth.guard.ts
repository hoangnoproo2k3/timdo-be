import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { envConfig } from '~/common/config/env.config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const error = request.query.error as string | undefined;
    if (error === 'access_denied') {
      this.logger.log('User cancelled Google login, redirecting to login page');

      response.redirect(envConfig.loginRedirectUrl);
      return false;
    }

    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (error) {
      this.logger.error(`Google auth failed: ${error}`);
      response.redirect(envConfig.loginRedirectUrl);
      return false;
    }
  }

  handleRequest<T = any>(err: any, user: T, info: any): T {
    if (err || !user) {
      this.logger.error(`Passport error: ${err || info}`);
      throw err || new Error('Google authentication failed');
    }
    return user;
  }
}
