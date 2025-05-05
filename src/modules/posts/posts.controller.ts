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
}
