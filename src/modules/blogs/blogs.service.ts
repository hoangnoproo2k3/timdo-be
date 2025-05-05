import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { generateUniqueSlug } from '../../common/utils/slug.utils';
import { FindAllBlogDto } from './dto/find-all-blogs';
import { Prisma } from '@prisma/client';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { JwtRequest } from '~/common/interfaces/request.interface';

@Injectable()
export class BlogsService {
  constructor(private prisma: PrismaService) {}

  async create(createBlogDto: CreateBlogDto, userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const slug = await generateUniqueSlug(tx, createBlogDto.title);
      if (!slug) {
        throw new InternalServerErrorException('Generated slug is invalid');
      }

      const { mediaItems, ...blogData } = createBlogDto;

      const article = await tx.article.create({
        data: {
          ...blogData,
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

      if (mediaItems && mediaItems.length > 0) {
        await tx.media.createMany({
          data: mediaItems.map((item) => ({
            url: item.url,
            type: item.type,
            articleId: article.id,
          })),
        });
      }

      const articleWithMedia = await tx.article.findUnique({
        where: { id: article.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          media: true,
        },
      });

      return {
        message: 'Blog created successfully',
        article: articleWithMedia,
      };
    });
  }

  async getBlogs(dto: FindAllBlogDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ArticleWhereInput = {
      deletedAt: null,
    };

    const search = dto.search?.trim();

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [blogs, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
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
          media: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: blogs,
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async updateBlog(
    id: number,
    updateBlogDto: UpdateBlogDto,
    user: JwtRequest['user'],
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const existingBlog = await tx.article.findUnique({
        where: { id },
        include: { media: true },
      });

      if (!existingBlog) {
        throw new NotFoundException('Blog not found');
      }

      const isOwner = existingBlog.userId === user.userId;
      const isAdmin = user.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new ForbiddenException(
          'You do not have permission to update this blog',
        );
      }

      let slug = existingBlog.slug;
      if (updateBlogDto.title && updateBlogDto.title !== existingBlog.title) {
        slug = await generateUniqueSlug(tx, updateBlogDto.title);
        if (!slug) {
          throw new InternalServerErrorException('Generated slug is invalid');
        }
      }

      const { mediaItems, ...blogData } = updateBlogDto;

      const updatedBlog = await tx.article.update({
        where: { id },
        data: {
          ...blogData,
          slug,
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
          media: true,
        },
      });

      if (mediaItems && mediaItems.length > 0) {
        // Delete existing media items
        await tx.media.deleteMany({
          where: { articleId: id },
        });

        // Create new media items
        await tx.media.createMany({
          data: mediaItems.map((item) => ({
            url: item.url,
            type: item.type,
            articleId: id,
          })),
        });

        // Fetch the updated blog with new media items
        const blogWithMedia = await tx.article.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
            media: true,
          },
        });

        return {
          message: 'Blog updated successfully',
          article: blogWithMedia,
        };
      }

      return {
        message: 'Blog updated successfully',
        article: updatedBlog,
      };
    });
  }

  async getDetailBlog(blogId: number) {
    const blog = await this.prisma.article.findUnique({
      where: { id: blogId },
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
        _count: {
          select: {
            comments: true,
            likes: true,
            reports: true,
          },
        },
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return {
      ...blog,
      commentsCount: blog._count.comments,
      likesCount: blog._count.likes,
    };
  }

  async softDeleteBlog(blogId: number, user: JwtRequest['user']) {
    const blog = await this.prisma.article.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const isOwner = blog.userId === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this blog',
      );
    }

    return this.prisma.article.update({
      where: { id: blogId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async hardDeleteBlog(blogId: number, user: JwtRequest['user']) {
    const blog = await this.prisma.article.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const isOwner = blog.userId === user.userId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this blog',
      );
    }

    return this.prisma.article.delete({
      where: { id: blogId },
    });
  }
}
