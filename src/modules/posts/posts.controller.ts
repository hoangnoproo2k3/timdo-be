import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '~/common/decorators';
import { JwtRequest } from '~/common/interfaces';
import { JwtAuthGuard, RolesGuard } from '~/modules/auth/guards';
import {
  CreatePostDto,
  FindAllPostsDto,
  ModeratePostDto,
  UpdatePostDto,
} from './dto';
import { PostsService } from './posts.service';

@Controller('/v1/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @Req() req: JwtRequest,
    @Body() createPostDto: CreatePostDto,
  ) {
    const userId = req.user.userId;
    return this.postsService.createPost(+userId, createPostDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  updatePostController(
    @Req() req: JwtRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.updatePostService(id, updatePostDto, req.user);
  }

  @Get()
  async getPosts(@Query() findAllPostsDto: FindAllPostsDto) {
    return this.postsService.getPosts(findAllPostsDto);
  }

  @Get(':id')
  getPostDetail(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostDetail(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/soft')
  @HttpCode(204)
  async softDeletePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: JwtRequest,
  ) {
    return this.postsService.softDeletePost(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/hard')
  @HttpCode(204)
  async hardDeletePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: JwtRequest,
  ) {
    return this.postsService.hardDeletePost(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id/moderate')
  async moderatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() moderatePostDto: ModeratePostDto,
  ) {
    return this.postsService.moderatePost(id, moderatePostDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upgrade')
  upgradePackage(
    @Param('id', ParseIntPipe) id: number,
    @Body('packageId', ParseIntPipe) packageId: number,
    @Req() req: JwtRequest,
  ) {
    return this.postsService.upgradePackage(id, packageId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/renew')
  renewPackage(@Param('id', ParseIntPipe) id: number, @Req() req: JwtRequest) {
    return this.postsService.renewPackage(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/boost')
  boostPost(
    @Param('id', ParseIntPipe) id: number,
    @Body('duration', ParseIntPipe) duration: number,
    @Body('price') price: number,
    @Req() req: JwtRequest,
  ) {
    return this.postsService.boostPost(id, duration, req.user.userId, price);
  }

  @Get('stats/packages')
  @UseGuards(JwtAuthGuard)
  async getPackageStats(@Req() req: JwtRequest) {
    return this.postsService.getUserPackageStats(req.user.userId);
  }

  @Get('stats/boosts')
  @UseGuards(JwtAuthGuard)
  async getBoostStats(@Req() req: JwtRequest) {
    return this.postsService.getUserBoostStats(req.user.userId);
  }

  @Get('moderation/pending')
  async getPostsNeedingModeration(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ) {
    return this.postsService.getPostsNeedingModeration(page, limit);
  }

  @Get('moderation/payment-pending')
  async getPostsNeedingPaymentConfirmation(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ) {
    return this.postsService.getPostsNeedingPaymentConfirmation(page, limit);
  }
}
