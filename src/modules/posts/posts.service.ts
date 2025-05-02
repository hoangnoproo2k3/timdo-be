import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtRequest } from '~/common/interfaces/request.interface';
import { generateUniqueSlug } from '~/common/utils/slug.utils';
import { PrismaService } from '~/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { FindAllPostsDto } from './dto/find-all-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: number, createPostDto: CreatePostDto) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const slug = await generateUniqueSlug(tx, createPostDto.title);
      if (!slug) {
        throw new InternalServerErrorException('Generated slug is invalid');
      }

      const post = await tx.post.create({
        data: {
          ...createPostDto,
          slug,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      return {
        message: 'Post created successfully',
        post,
      };
    });
  }

  async updatePostService(
    id: number,
    updatePost: UpdatePostDto,
    user: JwtRequest['user'],
  ) {
    if ('title' in updatePost && updatePost.title?.trim() === '') {
      throw new BadRequestException('Title cannot be empty');
    }

    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        userId: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const isOwner = post.userId === user?.userId;
    const isAdmin = user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this post',
      );
    }

    if (updatePost.title) {
      updatePost.slug = await generateUniqueSlug(this.prisma, updatePost.title);
    }

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: updatePost,
    });

    return updatedPost;
  }

  async getPosts(dto: FindAllPostsDto) {
    const page = parseInt(String(dto.page || 1));
    const limit = parseInt(String(dto.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      deletedAt: null,
    };

    const search = dto.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async getPostDetail(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        tags: true,
        media: true,
        likes: true,
        comments: true,
        reports: true,
        subscriptions: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            reports: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      ...post,
      commentsCount: post._count.comments,
      likesCount: post._count.likes,
    };
  }

  async softDeletePost(postId: number, user: JwtRequest['user']) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== user.userId && user.role !== 'admin') {
      throw new ForbiddenException(
        'You do not have permission to delete this post',
      );
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async hardDeletePost(postId: number, user: JwtRequest['user']) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== user.userId && user.role !== 'admin') {
      throw new ForbiddenException(
        'You do not have permission to delete this post',
      );
    }

    return this.prisma.post.delete({ where: { id: postId } });
  }
}
