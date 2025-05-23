import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { envConfig } from '~/common/config/env.config';
import { JwtRequest } from '~/common/interfaces';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { GoogleAuthGuard, JwtAuthGuard } from './guards';

interface GoogleUser {
  googleId: string;
  email: string;
  username: string;
}

@Controller('/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    maxAge: number;
  } {
    const isSecureContext =
      envConfig.nodeEnv === 'production' &&
      envConfig.loginRedirectUrl?.startsWith('https');

    return {
      httpOnly: true,
      secure: isSecureContext,
      sameSite: 'lax',
      maxAge: envConfig.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000, // days to ms
    };
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto, @Res() res: Response) {
    const { user, accessToken, refreshToken } =
      await this.authService.signUp(signUpDto);

    res.cookie('refresh_token', refreshToken, this.getCookieOptions());

    return res.json({
      message: 'User registered successfully',
      user,
      accessToken,
    });
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Res() res: Response) {
    const { user, accessToken, refreshToken } =
      await this.authService.signIn(signInDto);

    res.cookie('refresh_token', refreshToken, this.getCookieOptions());

    return res.json({
      message: 'User signed in successfully',
      user,
      accessToken,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req?.cookies['refresh_token'] as string | undefined;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token not found');
    }

    const {
      user,
      accessToken,
      refreshToken: newRefreshToken,
    } = await this.authService.refreshToken(refreshToken);

    // Set new refresh token in cookie
    res.cookie('refresh_token', newRefreshToken, this.getCookieOptions());

    return res.json({
      message: 'Token refreshed successfully',
      user,
      accessToken,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { logoutFromAllDevices?: boolean },
  ) {
    const refreshToken = req?.cookies['refresh_token'] as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken, body.logoutFromAllDevices);
    }

    // Clear the refresh token cookie
    res.cookie('refresh_token', '', {
      ...this.getCookieOptions(),
      maxAge: 0,
    });

    return res.json({
      message: body.logoutFromAllDevices
        ? 'Logged out from all devices successfully'
        : 'Logged out successfully',
    });
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GoogleUser;
    const { user, accessToken, refreshToken } =
      await this.authService.googleLogin(googleUser);

    res.cookie('refresh_token', refreshToken, this.getCookieOptions());

    // Encode user data
    const encodedUser = encodeURIComponent(JSON.stringify(user));

    return res.redirect(
      `${envConfig.loginRedirectUrl}?accessToken=${accessToken}&userData=${encodedUser}`,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: JwtRequest) {
    const user = await this.authService.getMe(req.user.userId);
    return {
      message: 'User retrieved successfully',
      user,
    };
  }

  @Post('check-admin')
  @HttpCode(HttpStatus.OK)
  async checkAdmin(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
  ) {
    const refreshToken =
      body.refreshToken ||
      (req?.cookies['refresh_token'] as string | undefined);
    console.log('Refresh token:', refreshToken);

    if (!refreshToken) {
      throw new BadRequestException('Refresh token not found');
    }

    const isAdmin = await this.authService.checkIsAdmin(refreshToken);

    return {
      isAdmin,
    };
  }
}
