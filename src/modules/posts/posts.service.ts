import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { generateUniqueSlug } from '~/common/utils/slug.utils';
import { PrismaService } from '~/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

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
}
