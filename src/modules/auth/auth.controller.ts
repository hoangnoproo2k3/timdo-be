import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { getRefreshTokenMaxAge } from '~/common/utils/jwt.util';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';

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
      secure: false,
      sameSite: 'lax',
      maxAge: getRefreshTokenMaxAge(this.configService) * 24 * 60 * 60 * 1000,
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
      maxAge: getRefreshTokenMaxAge(this.configService) * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'User signed in successfully',
      user,
      accessToken,
    });
  }
}
