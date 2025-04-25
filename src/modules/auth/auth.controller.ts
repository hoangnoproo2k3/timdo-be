import {
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
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { envConfig } from '~/common/config/env.config';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';

interface GoogleUser {
  googleId: string;
  email: string;
  username: string;
}

@Controller('/v1/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto, @Res() res: Response) {
    const { user, accessToken, refreshToken } =
      await this.authService.signUp(signUpDto);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: envConfig.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    });

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

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: envConfig.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'User signed in successfully',
      user,
      accessToken,
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

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: envConfig.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Google login successful',
      user,
      accessToken,
    });
  }
}
