import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtRequest } from '~/common/interfaces';
import { JwtAuthGuard } from '~/modules/auth/guards';
import {
  CreatePostDto,
  FindAllPostsDto,
  PostServicePackageDto,
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
    return this.postsService.createPost(req.user, createPostDto);
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
    if (findAllPostsDto.postType === 'LOST') {
      return this.postsService.getPublicPosts(findAllPostsDto);
    } else if (findAllPostsDto.postType === 'FOUND') {
      return this.postsService.getFoundPosts(findAllPostsDto);
    }

    return this.postsService.getPublicPosts(findAllPostsDto);
  }

  @Get('resolved')
  async getResolvedPosts(@Query() findAllPostsDto: FindAllPostsDto) {
    return this.postsService.getResolvedPosts(findAllPostsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  async getAdminPosts(
    @Req() req: JwtRequest,
    @Query() findAllPostsDto: FindAllPostsDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Not authorized to access admin posts');
    }
    return this.postsService.getPosts(findAllPostsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyPosts(
    @Req() req: JwtRequest,
    @Query() findAllPostsDto: FindAllPostsDto,
  ) {
    return this.postsService.getPosts({
      ...findAllPostsDto,
      userId: req.user.userId,
    });
  }

  @Get(':id')
  getPostDetail(@Param('id') idOrSlug: string) {
    return this.postsService.getPostDetailByIdOrSlug(idOrSlug);
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/upgrade')
  upgradePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() upgradePostDto: PostServicePackageDto,
    @Req() req: JwtRequest,
  ) {
    return this.postsService.upgradePost(req.user, id, upgradePostDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/renew')
  renewPost(
    @Param('id', ParseIntPipe) postId: number,
    @Body() dto: PostServicePackageDto,
    @Req() req: JwtRequest,
  ) {
    const user = req.user;
    return this.postsService.renewPost(user, postId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/resolve')
  async resolvePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: JwtRequest,
  ) {
    const user = req.user;
    return this.postsService.resolvePost(postId, user);
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
}
