import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  PostStatus,
  PostType,
  Prisma,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import { JwtRequest } from '~/common/interfaces';
import { generateUniqueSlug } from '~/common/utils';
import { PrismaService } from '~/prisma';
import { CreatePostDto, FindAllPostsDto, UpdatePostDto } from './dto';

interface MediaItem {
  url: string;
  type: string;
  postId: number;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(user: JwtRequest['user'], createPostDto: CreatePostDto) {
    const userId = user.userId;
    return await this.prisma.$transaction(async (tx) => {
      const slug = await generateUniqueSlug(tx, createPostDto.title);
      if (!slug) {
        throw new InternalServerErrorException('Generated slug is invalid');
      }

      const { mediaItems, packageId, paymentProofUrl, ...postData } =
        createPostDto;

      if (
        postData.postType === PostType.LOST &&
        (packageId === undefined || packageId === null)
      ) {
        throw new BadRequestException('Vui lòng chọn gói dịch vụ');
      }

      if (
        postData.postType === PostType.LOST &&
        packageId !== undefined &&
        packageId < 1
      ) {
        throw new BadRequestException('Gói dịch vụ không hợp lệ');
      }

      const initialStatus: PostStatus =
        postData.postType === PostType.FOUND ||
        user.role === Role.ADMIN ||
        (packageId && packageId > 1)
          ? PostStatus.APPROVED
          : PostStatus.PENDING;

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

      if (postData.postType === 'LOST' && packageId) {
        const servicePackage = await tx.servicePackage.findUnique({
          where: { id: packageId },
        });

        if (!servicePackage) {
          throw new NotFoundException(
            `Không tìm thấy gói dịch vụ với ID ${packageId}`,
          );
        }
        if (packageId > 1) {
          // Calculate service package end time
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + servicePackage.duration);

          const subscription = await tx.postSubscription.create({
            data: {
              userId,
              postId: post.id,
              packageId,
              action: 'NEW',
              startDate,
              endDate,
              status:
                user.role === Role.ADMIN
                  ? SubscriptionStatus.ACTIVE
                  : SubscriptionStatus.PENDING,
            },
          });

          await tx.payment.create({
            data: {
              userId,
              packageId,
              postSubscriptionId: subscription.id,
              amount: servicePackage.price,
              paymentType: 'PACKAGE',
              status:
                user.role === Role.ADMIN
                  ? PaymentStatus.PAID
                  : PaymentStatus.PENDING,
              proofImageUrl: paymentProofUrl,
            },
          });
        }
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
        postType: true,
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

    if (
      updatePost.packageId !== undefined &&
      post.postType === PostType.LOST &&
      updatePost.packageId < 1
    ) {
      throw new BadRequestException('Gói dịch vụ không hợp lệ');
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

    // Filter by status if provided
    if (dto.status) {
      where.status = dto.status;
    }

    // Filter by post type if provided
    if (dto.postType) {
      where.postType = dto.postType;
    }

    // Filter by package type if provided
    if (dto.packageType) {
      where.postSubscriptions = {
        some: {
          package: {
            packageType: dto.packageType,
          },
        },
      };
    }

    // Filter by payment status if provided
    if (dto.paymentStatus) {
      where.postSubscriptions = {
        some: {
          payment: {
            status: dto.paymentStatus,
          },
        },
      };
    }

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
        orderBy: [{ isBoosted: 'desc' }, { createdAt: 'desc' }],
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
            include: {
              package: true,
              payment: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          boostTransactions: {
            where: {
              isActive: true,
              endDate: {
                gte: new Date(),
              },
            },
            include: {
              payment: true,
            },
            take: 1,
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    // Process posts to add convenience properties for the frontend
    const processedPosts = posts.map((post) => {
      const latestSubscription = post.postSubscriptions?.[0];
      const payment = latestSubscription?.payment;
      const activeBoost = post.boostTransactions?.[0];

      return {
        ...post,
        // Add isPaid property based on subscription data
        isPaid: !!latestSubscription && latestSubscription.packageId > 1,
        // Add paymentStatus property based on payment data
        paymentStatus: payment?.status,
        // Add package info
        currentPackage: latestSubscription?.package,
        // Add subscription status
        subscriptionStatus: latestSubscription?.status,
        // Add boost info
        isBoosted: !!activeBoost,
        boostEndDate: activeBoost?.endDate,
        boostPaymentStatus: activeBoost?.payment?.status,
        // Include whether post requires payment confirmation
        needsPaymentConfirmation:
          !!latestSubscription &&
          latestSubscription.packageId > 1 &&
          payment?.status === PaymentStatus.PENDING,
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
        postSubscriptions: {
          include: {
            package: true,
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        boostTransactions: {
          include: {
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            reports: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    const latestSubscription = post.postSubscriptions?.[0];
    const payment = latestSubscription?.payment;

    return {
      ...post,
      commentsCount: post._count.comments,
      likesCount: post._count.likes,
      isPaid: !!latestSubscription && latestSubscription.packageId > 1,
      paymentStatus: payment?.status,
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

  /**
   * Nâng cấp gói dịch vụ cho bài đăng
   */
  async upgradePackage(postId: number, newPackageId: number, userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      // Kiểm tra bài đăng và quyền hạn
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: {
          postSubscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              package: true,
            },
          },
        },
      });

      if (!post) {
        throw new NotFoundException('Bài đăng không tồn tại');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException(
          'Bạn không có quyền nâng cấp bài đăng này',
        );
      }

      // Kiểm tra gói mới
      const newPackage = await tx.servicePackage.findUnique({
        where: { id: newPackageId },
      });

      if (!newPackage) {
        throw new NotFoundException('Gói dịch vụ không tồn tại');
      }

      // Kiểm tra subscription hiện tại
      if (!post.postSubscriptions || post.postSubscriptions.length === 0) {
        throw new BadRequestException(
          'Bài đăng không có gói dịch vụ để nâng cấp',
        );
      }

      const currentSubscription = post.postSubscriptions[0];
      const prevPackageId = currentSubscription.packageId;

      // Tạo subscription mới và cập nhật subscription cũ
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + newPackage.duration);

      // Cập nhật subscription hiện tại
      await tx.postSubscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: 'CANCELLED',
        },
      });

      // Tạo subscription mới
      const newSubscription = await tx.postSubscription.create({
        data: {
          userId,
          postId,
          packageId: newPackageId,
          action: 'UPGRADE',
          startDate,
          endDate,
          previousPackageId: prevPackageId,
          previousEndDate: currentSubscription.endDate,
          status: 'ACTIVE',
        },
      });

      // Tạo payment cho subscription mới
      const payment = await tx.payment.create({
        data: {
          userId,
          packageId: newPackageId,
          postSubscriptionId: newSubscription.id,
          amount: newPackage.price,
          paymentType: 'PACKAGE',
          status: PaymentStatus.PENDING,
        },
      });

      // Cập nhật thông tin bài đăng
      // await tx.post.update({
      //   where: { id: postId },
      //   data: {
      //     isPaid: true,
      //     paymentStatus: 'UNPAID',
      //   },
      // });

      return {
        message:
          'Đã nâng cấp gói dịch vụ thành công, vui lòng thanh toán để kích hoạt',
        subscription: newSubscription,
        payment,
      };
    });
  }

  /**
   * Gia hạn gói dịch vụ cho bài đăng
   */
  async renewPackage(postId: number, userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      // Kiểm tra bài đăng và quyền hạn
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: {
          postSubscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              package: true,
            },
          },
        },
      });

      if (!post) {
        throw new NotFoundException('Bài đăng không tồn tại');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền gia hạn bài đăng này');
      }

      // Kiểm tra subscription
      if (!post.postSubscriptions || post.postSubscriptions.length === 0) {
        throw new BadRequestException(
          'Bài đăng không có gói dịch vụ để gia hạn',
        );
      }

      const currentSubscription = post.postSubscriptions[0];
      const currentPackage = currentSubscription.package;

      // Tạo subscription mới
      const startDate = new Date(currentSubscription.endDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + currentPackage.duration);

      const newSubscription = await tx.postSubscription.create({
        data: {
          userId,
          postId,
          packageId: currentPackage.id,
          action: 'RENEW',
          startDate,
          endDate,
          previousEndDate: currentSubscription.endDate,
          status: 'ACTIVE',
        },
      });

      // Tạo payment cho subscription mới
      const payment = await tx.payment.create({
        data: {
          userId,
          packageId: currentPackage.id,
          postSubscriptionId: newSubscription.id,
          amount: currentPackage.price,
          paymentType: 'PACKAGE',
          status: PaymentStatus.PENDING,
        },
      });

      return {
        message:
          'Đã gia hạn gói dịch vụ thành công, vui lòng thanh toán để kích hoạt',
        subscription: newSubscription,
        payment,
      };
    });
  }

  /**
   * Đẩy tin lên top
   */
  async boostPost(
    postId: number,
    boostDuration: number,
    userId: number,
    price?: number,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Kiểm tra bài đăng và quyền hạn
      const post = await tx.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Bài đăng không tồn tại');
      }

      if (post.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền đẩy tin bài đăng này');
      }

      // Tính giá đẩy tin nếu không được cung cấp
      const boostPrice = price || this.calculateBoostPrice(boostDuration);

      // Tạo thông tin đẩy tin mới
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + boostDuration);

      const boostTransaction = await tx.boostTransaction.create({
        data: {
          postId,
          userId,
          price: boostPrice,
          duration: boostDuration,
          startDate,
          endDate,
          isActive: true,
        },
      });

      // Tạo payment cho boost transaction
      const payment = await tx.payment.create({
        data: {
          userId,
          boostTransactionId: boostTransaction.id,
          amount: boostPrice,
          paymentType: 'BOOST',
          status: PaymentStatus.PENDING,
        },
      });

      // Cập nhật thông tin bài đăng
      await tx.post.update({
        where: { id: postId },
        data: {
          isBoosted: true,
          boostUntil: endDate,
          lastBoostedAt: new Date(),
        },
      });

      return {
        message:
          'Đã đăng ký đẩy tin thành công, vui lòng thanh toán để kích hoạt',
        boostTransaction,
        payment,
      };
    });
  }

  /**
   * Tính giá đẩy tin dựa trên thời gian
   */
  private calculateBoostPrice(duration: number): number {
    // Giá cơ bản cho 1 ngày
    const basePrice = 10000;

    // Tính giá theo công thức, có giảm giá khi mua nhiều ngày
    let price = basePrice * duration;

    // Giảm giá khi thời gian đẩy tin dài
    if (duration >= 7) {
      price = price * 0.9; // Giảm 10% cho 7+ ngày
    }
    if (duration >= 30) {
      price = price * 0.8; // Giảm thêm 20% cho 30+ ngày
    }

    return price;
  }

  /**
   * Lấy thống kê về các gói dịch vụ của người dùng
   */
  async getUserPackageStats(userId: number) {
    const postPackages = await this.prisma.postSubscription.findMany({
      where: {
        userId,
      },
      include: {
        package: true,
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            postType: true,
            status: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentType: true,
            paidAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Tính toán các thống kê
    const stats = {
      totalSubscriptions: postPackages.length,
      activeSubscriptions: postPackages.filter((sub) => sub.status === 'ACTIVE')
        .length,
      expiredSubscriptions: postPackages.filter(
        (sub) => sub.status === 'EXPIRED',
      ).length,
      cancelledSubscriptions: postPackages.filter(
        (sub) => sub.status === 'CANCELLED',
      ).length,

      totalSpent: postPackages
        .filter((sub) => sub.payment?.status === 'PAID')
        .reduce((total, sub) => total + (sub.payment?.amount || 0), 0),

      packagesByType: {
        BASIC: postPackages.filter((sub) => sub.package.packageType === 'FREE')
          .length,
        STANDARD: postPackages.filter(
          (sub) => sub.package.packageType === 'PRIORITY',
        ).length,
        PREMIUM: postPackages.filter(
          (sub) => sub.package.packageType === 'EXPRESS',
        ).length,
      },

      actionStats: {
        NEW: postPackages.filter((sub) => sub.action === 'NEW').length,
        RENEW: postPackages.filter((sub) => sub.action === 'RENEW').length,
        UPGRADE: postPackages.filter((sub) => sub.action === 'UPGRADE').length,
      },

      // Danh sách gói đăng ký đang hoạt động
      activePackages: postPackages
        .filter((sub) => sub.status === 'ACTIVE')
        .map((sub) => ({
          subscriptionId: sub.id,
          packageName: sub.package.name,
          packageType: sub.package.packageType,
          postTitle: sub.post.title,
          postId: sub.post.id,
          startDate: sub.startDate,
          endDate: sub.endDate,
          daysRemaining: Math.ceil(
            (new Date(sub.endDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          paymentStatus: sub.payment?.status || 'UNKNOWN',
        })),

      // Lịch sử đăng ký
      recentActivity: postPackages.slice(0, 10).map((sub) => ({
        subscriptionId: sub.id,
        packageName: sub.package.name,
        packageType: sub.package.packageType,
        postTitle: sub.post.title,
        postId: sub.post.id,
        action: sub.action,
        status: sub.status,
        createdAt: sub.createdAt,
        paymentStatus: sub.payment?.status || 'UNKNOWN',
      })),
    };

    return stats;
  }

  /**
   * Lấy thống kê về các lần đẩy tin của người dùng
   */
  async getUserBoostStats(userId: number) {
    const boostTransactions = await this.prisma.boostTransaction.findMany({
      where: {
        userId,
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            postType: true,
            status: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentType: true,
            paidAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Tính toán các thống kê
    const stats = {
      totalBoosts: boostTransactions.length,
      activeBoosts: boostTransactions.filter((boost) => boost.isActive).length,
      completedBoosts: boostTransactions.filter(
        (boost) => !boost.isActive && new Date() > new Date(boost.endDate),
      ).length,

      totalSpent: boostTransactions
        .filter((boost) => boost.payment?.status === 'PAID')
        .reduce((total, boost) => total + (boost.payment?.amount || 0), 0),

      // Phân tích theo thời hạn đẩy tin
      durationStats: {
        lessThan7Days: boostTransactions.filter((boost) => boost.duration < 7)
          .length,
        from7To30Days: boostTransactions.filter(
          (boost) => boost.duration >= 7 && boost.duration < 30,
        ).length,
        moreThan30Days: boostTransactions.filter(
          (boost) => boost.duration >= 30,
        ).length,
      },

      // Danh sách đẩy tin đang hoạt động
      // activeBoosts: boostTransactions
      //   .filter((boost) => boost.isActive)
      //   .map((boost) => ({
      //     boostId: boost.id,
      //     postTitle: boost.post.title,
      //     postId: boost.post.id,
      //     startDate: boost.startDate,
      //     endDate: boost.endDate,
      //     daysRemaining: Math.ceil(
      //       (new Date(boost.endDate).getTime() - new Date().getTime()) /
      //         (1000 * 60 * 60 * 24),
      //     ),
      //     price: boost.price,
      //     paymentStatus: boost.payment?.status || 'UNKNOWN',
      //   })),

      // Lịch sử đẩy tin
      recentActivity: boostTransactions.slice(0, 10).map((boost) => ({
        boostId: boost.id,
        postTitle: boost.post.title,
        postId: boost.post.id,
        startDate: boost.startDate,
        endDate: boost.endDate,
        duration: boost.duration,
        price: boost.price,
        isActive: boost.isActive,
        paymentStatus: boost.payment?.status || 'UNKNOWN',
        createdAt: boost.createdAt,
      })),
    };

    return stats;
  }
}
