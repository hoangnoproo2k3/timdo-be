import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  PostStatus,
  PostType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '~/prisma';
import { ModerateAction, ModeratePostDto } from '../posts/dto';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  async getPostsNeedingModeration(page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: {
          status: PostStatus.PENDING,
          deletedAt: null,
          postType: PostType.LOST,
        },
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
          postSubscriptions: {
            where: {
              status: SubscriptionStatus.PENDING,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  packageType: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.post.count({
        where: {
          status: PostStatus.PENDING,
          deletedAt: null,
          postType: PostType.LOST,
        },
      }),
    ]);

    // Gắn flag trực tiếp vào kết quả
    const processedPosts = posts.map((post) => {
      const latestSub = post.postSubscriptions[0] || null;

      return {
        ...post,
        postSubscriptions: latestSub ? [latestSub] : [],
        hasPendingSubscription: !!latestSub,
        packageType: latestSub?.package?.packageType || null,
      };
    });

    return {
      data: processedPosts,
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async getPostsNeedingPaymentConfirmation(page = 1, limit = 15) {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await this.prisma.$transaction([
      this.prisma.postSubscription.findMany({
        where: {
          status: SubscriptionStatus.PENDING,
          payment: {
            status: PaymentStatus.PENDING,
          },
          post: {
            deletedAt: null,
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          post: {
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
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              packageType: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              proofImageUrl: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.postSubscription.count({
        where: {
          status: SubscriptionStatus.PENDING,
          payment: {
            status: PaymentStatus.PENDING,
          },
          post: {
            deletedAt: null,
          },
        },
      }),
    ]);

    const posts = subscriptions.map((sub) => ({
      ...sub.post,
      postSubscriptions: [sub],
      needsPaymentConfirmation: true,
      paymentStatus: PaymentStatus.PENDING,
    }));

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

  async moderatePost(postId: number, dto: ModeratePostDto) {
    return await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: {
          user: true,
          postSubscriptions: {
            include: {
              package: true,
              payment: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
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

        case ModerateAction.CONFIRM_PAYMENT: {
          updateData.status = 'APPROVED';

          const pendingSubscription = post.postSubscriptions.find(
            (sub) =>
              sub.status === SubscriptionStatus.PENDING &&
              sub.payment?.status === PaymentStatus.PENDING,
          );

          if (!pendingSubscription) {
            throw new BadRequestException(
              'Không tìm thấy gói cần xác nhận thanh toán',
            );
          }

          await tx.payment.update({
            where: { id: pendingSubscription.payment!.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(),
            },
          });

          await tx.postSubscription.update({
            where: { id: pendingSubscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
            },
          });

          break;
        }

        default:
          throw new BadRequestException('Hành động không hợp lệ');
      }

      const updatedPost = await tx.post.update({
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
          postSubscriptions: {
            include: {
              package: true,
              payment: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

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
    });
  }
}
