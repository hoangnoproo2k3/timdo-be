import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { JwtRequest } from '~/common/interfaces/request.interface';
import { CreateBlogDto } from './dto/create-blog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FindAllBlogDto } from './dto/find-all-blogs';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Controller('/v1/blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBlog(
    @Req() req: JwtRequest,
    @Body() createBlogDto: CreateBlogDto,
  ) {
    const userId = req.user.userId;
    return this.blogsService.create(createBlogDto, userId);
  }

  @Get()
  async getBlogs(@Query() findAllBlogDto: FindAllBlogDto) {
    return this.blogsService.getBlogs(findAllBlogDto);
  }

  @Get(':id')
  async getDetailBlog(@Param('id', ParseIntPipe) id: number) {
    return this.blogsService.getDetailBlog(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  @HttpCode(HttpStatus.OK)
  async updateBlog(
    @Req() req: JwtRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogDto: UpdateBlogDto,
  ) {
    return this.blogsService.updateBlog(id, updateBlogDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/soft')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteBlog(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: JwtRequest,
  ) {
    return this.blogsService.softDeleteBlog(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDeleteBlog(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: JwtRequest,
  ) {
    return this.blogsService.hardDeleteBlog(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveBlog(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: JwtRequest,
  ) {
    return this.blogsService.approveBlog(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectBlog(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: JwtRequest,
  ) {
    return this.blogsService.rejectBlog(id, req.user);
  }
}
