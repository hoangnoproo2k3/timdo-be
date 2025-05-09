import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '~/common/decorators';
import { JwtAuthGuard, RolesGuard } from '~/modules/auth/guards';
import { ModeratePostDto } from '../posts/dto';
import { PaginationDto } from './dto';
import { ModerationService } from './moderation.service';

@Controller('/v1/moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('posts/pending')
  async getPostsNeedingModeration(@Query() query: PaginationDto) {
    return this.moderationService.getPostsNeedingModeration(
      query.page,
      query.limit,
    );
  }

  @Get('posts/payment-pending')
  async getPostsNeedingPaymentConfirmation(@Query() query: PaginationDto) {
    return this.moderationService.getPostsNeedingPaymentConfirmation(
      query.page,
      query.limit,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('posts/:id')
  async moderatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() moderatePostDto: ModeratePostDto,
  ) {
    return this.moderationService.moderatePost(id, moderatePostDto);
  }
}
