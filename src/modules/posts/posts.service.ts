import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, Prisma } from '@prisma/client';
import { JwtRequest } from '~/common/interfaces';
import { generateUniqueSlug } from '~/common/utils';
import { PrismaService } from '~/prisma';
import {
  CreatePostDto,
  FindAllPostsDto,
  ModerateAction,
  ModeratePostDto,
  UpdatePostDto,
} from './dto';

interface MediaItem {
  url: string;
  type: string;
  postId: number;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: number, createPostDto: CreatePostDto) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const slug = await generateUniqueSlug(tx, createPostDto.title);
      if (!slug) {
        throw new InternalServerErrorException('Generated slug is invalid');
      }

      const { mediaItems, ...postData } = createPostDto;

      let initialStatus: PostStatus = 'PENDING';

      // Nếu là bài nhặt được -> always auto-approve
      if (postData.postType === 'FOUND') {
        initialStatus = 'APPROVED';
      }
      // Nếu là admin -> always auto-approve
      else if (user.role === 'ADMIN') {
        initialStatus = 'APPROVED';
      }
      // Nếu là bài trả phí của user thường -> APPROVED nhưng paymentStatus = 'unpaid'
      else if ('isPaid' in createPostDto && createPostDto.isPaid) {
        initialStatus = 'APPROVED';
      }

      const post = await tx.post.create({
        data: {
          ...postData,
          slug,
          userId,
          status: initialStatus,
        },
      });

      const mediaToCreate: MediaItem[] = [];

      if (mediaItems && mediaItems.length > 0) {
        mediaToCreate.push(
          ...mediaItems.map((item) => ({
            url: item.url,
            type: item.type,
            postId: post.id,
          })),
        );
      }

      if (mediaToCreate.length > 0) {
        await tx.media.createMany({
          data: mediaToCreate,
        });
      }

      const postWithMedia = await tx.post.findUnique({
        where: { id: post.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
          media: true,
        },
      });

      return {
        message: 'Post created successfully',
        post: postWithMedia,
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
        media: true,
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

    return await this.prisma.$transaction(async (tx) => {
      if (updatePost.title) {
        updatePost.slug = await generateUniqueSlug(tx, updatePost.title);
      }

      const { mediaItems, ...postData } = updatePost;

      await tx.post.update({
        where: { id },
        data: postData,
      });

      // Xử lý media cho bài đăng
      let shouldReplaceMedia = false;
      const mediaToCreate: MediaItem[] = [];

      // Kiểm tra xem có thay đổi media hay không
      if (mediaItems !== undefined) {
        shouldReplaceMedia = true;

        if (mediaItems && mediaItems.length > 0) {
          mediaItems.forEach((item) => {
            mediaToCreate.push({
              url: item.url,
              type: item.type,
              postId: id,
            });
          });
        }
      }

      // Nếu cần thay thế media, xóa cái cũ và thêm cái mới
      if (shouldReplaceMedia) {
        if (post.media && post.media.length > 0) {
          await tx.media.deleteMany({
            where: { postId: id },
          });
        }

        if (mediaToCreate.length > 0) {
          await tx.media.createMany({
            data: mediaToCreate,
          });
        }
      }

      // Return the updated post with media
      const postWithMedia = await tx.post.findUnique({
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

      return postWithMedia;
    });
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
          media: true,
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

  async moderatePost(postId: number, dto: ModeratePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) {
      throw new NotFoundException(`Không tìm thấy bài đăng với ID ${postId}`);
    }

    const updateData: Prisma.PostUpdateInput = {};

    switch (dto.action) {
      case ModerateAction.APPROVE:
        updateData.status = 'APPROVED';
        break;

      case ModerateAction.REJECT:
        updateData.status = 'REJECTED';
        if (dto.reason) {
          updateData.rejectionReason = dto.reason;
        }
        break;

      case ModerateAction.CONFIRM_PAYMENT:
        if (!post.isPaid) {
          throw new BadRequestException(
            'Không thể xác nhận thanh toán cho bài đăng miễn phí',
          );
        }
        updateData.paymentStatus = 'PAID';
        updateData.status = 'APPROVED';
        break;

      default:
        throw new BadRequestException('Hành động không hợp lệ');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // TODO: Gửi thông báo cho người dùng nếu dto.notifyUser === true

    let message = '';
    switch (dto.action) {
      case ModerateAction.APPROVE:
        message = 'Bài đăng đã được phê duyệt thành công';
        break;
      case ModerateAction.REJECT:
        message = 'Bài đăng đã bị từ chối';
        break;
      case ModerateAction.CONFIRM_PAYMENT:
        message = 'Đã xác nhận thanh toán cho bài đăng';
        break;
    }

    return {
      message,
      post: updatedPost,
    };
  }
}
