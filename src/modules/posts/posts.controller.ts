import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtRequest } from '~/common/interfaces/request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
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
}
