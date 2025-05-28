import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  Post,
  PostStatus,
  PostType,
  Prisma,
  Role,
  SubscriptionStatus,
  User,
} from '@prisma/client';
import { JwtRequest } from '~/common/interfaces';
import { generateUniqueSlug } from '~/common/utils';
import { EmailService } from '~/modules/email/email.service';
import { PrismaService } from '~/prisma';
import {
  CreatePostDto,
  FindAllPostsDto,
  PostServicePackageDto,
  UpdatePostDto,
} from './dto';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';

interface MediaItem {
  url: string;
  type: string;
  postId: number;
}

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async createPost(user: JwtRequest['user'], createPostDto: CreatePostDto) {
    const userId = user.userId;
    return await this.prisma.$transaction(async (tx) => {
      const slug = await generateUniqueSlug(tx, createPostDto.title);
      if (!slug) {
        throw new InternalServerErrorException('Generated slug is invalid');
      }

      const { mediaItems, packageId, paymentProofUrl, tags, ...postData } =
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
          tags: tags
            ? {
                connectOrCreate: tags.map((tag) => ({
                  where: { name: tag.name },
                  create: {
                    name: tag.name,
                    slug: tag.name.toLowerCase().replace(/\s+/g, '-'),
                  },
                })),
              }
            : undefined,
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

      // Now, send the email if the conditions are met
      if (
        postWithMedia &&
        postData.postType === PostType.LOST &&
        packageId === 1
      ) {
        try {
          await this.emailService.sendFreePostCreationEmail(
            postWithMedia.user as User,
            postWithMedia as unknown as Post,
          );
        } catch (error) {
          console.error('Error sending email:', error);
        }
      }

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
    const isAdmin = user?.role === Role.ADMIN;

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

      const { mediaItems, tags, ...postData } = updatePost;

      await tx.post.update({
        where: { id },
        data: {
          ...postData,
          tags: tags
            ? {
                connectOrCreate: tags.map((tag) => ({
                  where: { name: tag.name },
                  create: {
                    name: tag.name,
                    slug: tag.name.toLowerCase().replace(/\s+/g, '-'),
                  },
                })),
              }
            : undefined,
        },
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

    // Filter by user ID if provided
    if (dto.userId) {
      where.userId = dto.userId;
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
          tags: true,
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

  async getPublicPosts(dto: FindAllPostsDto) {
    const page = parseInt(String(dto.page || 1));
    const limit = parseInt(String(dto.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      status: PostStatus.APPROVED,
      postType: PostType.LOST,
    };

    const search = dto.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (dto.location) {
      where.location = { contains: dto.location };
    }

    if (dto.category) {
      where.category = dto.category;
    }

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isBoosted: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          location: true,
          category: true,
          date: true,
          viewCount: true,
          isBoosted: true,
          boostUntil: true,
          createdAt: true,
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
            },
            take: 1, // Chỉ lấy 1 ảnh đầu tiên cho danh sách
          },
          postSubscriptions: {
            where: {
              status: SubscriptionStatus.ACTIVE,
              endDate: {
                gte: new Date(), // Chỉ lấy subscription còn hạn
              },
            },
            select: {
              package: {
                select: {
                  name: true,
                  packageType: true,
                },
              },
              endDate: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    // Process posts để thêm thông tin package và sắp xếp theo ưu tiên
    const processedPosts = posts.map((post) => {
      const activeSubscription = post.postSubscriptions?.[0];

      let packageInfo: { name: string; type: string } | null = null;
      let packagePriority = 0;

      if (activeSubscription?.package) {
        const packageType = activeSubscription.package.packageType;
        packageInfo = {
          name: activeSubscription.package.name,
          type: packageType,
        };

        // Set priority for sorting
        switch (packageType) {
          case 'VIP':
            packagePriority = 4;
            break;
          case 'EXPRESS':
            packagePriority = 3;
            break;
          case 'PRIORITY':
            packagePriority = 2;
            break;
          case 'FREE':
            packagePriority = 1;
            break;
          default:
            packagePriority = 0;
        }
      }

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description,
        location: post.location,
        category: post.category,
        date: post.date,
        viewCount: post.viewCount,
        isBoosted: post.isBoosted,
        boostUntil: post.boostUntil,
        createdAt: post.createdAt,
        tags: post.tags,
        user: post.user,
        thumbnail: post.media?.[0] || null,
        package: packageInfo,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        _packagePriority: packagePriority,
        _isBoosted: post.isBoosted ? 1 : 0,
      };
    });

    // Sắp xếp theo thứ tự ưu tiên: Boosted > Package Priority > Newest
    processedPosts.sort((a, b) => {
      // 1. Boosted posts first
      if (a._isBoosted !== b._isBoosted) {
        return b._isBoosted - a._isBoosted;
      }

      // 2. Package priority (VIP > EXPRESS > PRIORITY > FREE/none)
      if (a._packagePriority !== b._packagePriority) {
        return b._packagePriority - a._packagePriority;
      }

      // 3. Newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Remove sorting fields before returning
    const finalPosts = processedPosts.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ _packagePriority, _isBoosted, ...post }) => post,
    );

    return {
      data: finalPosts,
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async getPostDetailByIdOrSlug(idOrSlug: string) {
    const isNumeric = /^\d+$/.test(idOrSlug);

    const where = isNumeric
      ? { id: parseInt(idOrSlug, 10) }
      : { slug: idOrSlug };

    const post = await this.prisma.post.findUnique({
      where,
      include: this.getPostIncludeOptions(),
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    await this.incrementViewCount(post.id);

    return this.formatPostResponse(post);
  }

  async getPostDetail(postId: number) {
    return this.getPostDetailByIdOrSlug(postId.toString());
  }

  private getPostIncludeOptions() {
    return {
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
          createdAt: 'desc' as const,
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
      _count: {
        select: {
          comments: true,
          likes: true,
          reports: true,
        },
      },
    } as const;
  }

  private async incrementViewCount(postId: number) {
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  private formatPostResponse(
    post: Prisma.PostGetPayload<{
      include: ReturnType<PostsService['getPostIncludeOptions']>;
    }>,
  ) {
    const latestSubscription = post.postSubscriptions?.[0];
    const payment = latestSubscription?.payment;
    const activeBoost = post.boostTransactions?.[0];

    return {
      ...post,
      commentsCount: post._count.comments,
      likesCount: post._count.likes,
      reportsCount: post._count.reports,
      isPaid: !!latestSubscription && latestSubscription.packageId > 1,
      paymentStatus: payment?.status,
      currentPackage: latestSubscription?.package,
      subscriptionStatus: latestSubscription?.status,
      isBoosted: !!activeBoost,
      boostEndDate: activeBoost?.endDate,
      boostPaymentStatus: activeBoost?.payment?.status,
      needsPaymentConfirmation:
        !!latestSubscription &&
        latestSubscription.packageId > 1 &&
        payment?.status === PaymentStatus.PENDING,
    };
  }

  async softDeletePost(postId: number, user: JwtRequest['user']) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== user.userId && user.role !== Role.ADMIN) {
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
    if (post.userId !== user.userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete this post',
      );
    }

    return this.prisma.post.delete({ where: { id: postId } });
  }

  async upgradePost(
    user: JwtRequest['user'],
    postId: number,
    dto: PostServicePackageDto,
  ) {
    const { packageId, paymentProofUrl } = dto;

    return await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: {
          postSubscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!post) throw new NotFoundException('Bài viết không tồn tại');
      if (post.postType !== PostType.LOST)
        throw new BadRequestException('Chỉ có thể nâng cấp bài đăng bị mất');
      if (post.userId !== user.userId && user.role !== Role.ADMIN)
        throw new ForbiddenException(
          'Bạn không có quyền nâng cấp bài viết này',
        );

      const currentSub = post.postSubscriptions[0];

      if (currentSub && currentSub.packageId >= packageId) {
        throw new BadRequestException(
          'Gói hiện tại đã bằng hoặc cao hơn gói bạn muốn nâng cấp',
        );
      }

      const servicePackage = await tx.servicePackage.findUnique({
        where: { id: packageId },
      });

      if (!servicePackage) {
        throw new NotFoundException(
          `Không tìm thấy gói dịch vụ với ID ${packageId}`,
        );
      }

      const startDate = new Date();
      const now = new Date();
      const baseDate =
        currentSub && currentSub.endDate > now
          ? new Date(currentSub.endDate)
          : now;

      const endDate = new Date(baseDate);
      endDate.setDate(endDate.getDate() + servicePackage.duration);

      const subscription = await tx.postSubscription.create({
        data: {
          userId: user.userId,
          postId: post.id,
          packageId,
          action: 'UPGRADE',
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
          userId: user.userId,
          packageId,
          postSubscriptionId: subscription.id,
          amount: servicePackage.price,
          paymentType: 'UPGRADE',
          status:
            user.role === Role.ADMIN
              ? PaymentStatus.PAID
              : PaymentStatus.PENDING,
          proofImageUrl: paymentProofUrl,
        },
      });

      // Cập nhật trạng thái bài viết nếu admin hoặc gói > 1
      if (user.role === Role.ADMIN || packageId > 1) {
        await tx.post.update({
          where: { id: post.id },
          data: {
            status: PostStatus.APPROVED,
          },
        });
      }

      const updatedPost = await tx.post.findUnique({
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
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      return {
        message: 'Nâng cấp bài viết thành công',
        post: updatedPost,
      };
    });
  }

  async renewPost(
    user: JwtRequest['user'],
    postId: number,
    dto: PostServicePackageDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: {
          postSubscriptions: {
            orderBy: { endDate: 'desc' },
            take: 1,
          },
        },
      });

      if (!post) throw new NotFoundException('Không tìm thấy bài viết');
      if (post.userId !== user.userId && user.role !== Role.ADMIN)
        throw new ForbiddenException('Bạn không có quyền gia hạn bài viết này');

      const latestSubscription = post.postSubscriptions[0];
      const now = new Date();

      if (!latestSubscription || latestSubscription.endDate > now) {
        throw new BadRequestException('Gói hiện tại chưa hết hạn');
      }

      const servicePackage = await tx.servicePackage.findUnique({
        where: { id: dto.packageId },
      });

      if (!servicePackage || servicePackage.id <= 1) {
        throw new BadRequestException('Vui lòng chọn một gói trả phí hợp lệ');
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + servicePackage.duration);

      const subscription = await tx.postSubscription.create({
        data: {
          userId: user.userId,
          postId,
          packageId: dto.packageId,
          action: 'RENEW',
          startDate,
          endDate,
          status: user.role === Role.ADMIN ? 'ACTIVE' : 'PENDING',
        },
      });

      await tx.payment.create({
        data: {
          userId: user.userId,
          packageId: dto.packageId,
          postSubscriptionId: subscription.id,
          amount: servicePackage.price,
          paymentType: 'PACKAGE',
          status: user.role === Role.ADMIN ? 'PAID' : 'PENDING',
          proofImageUrl: dto.paymentProofUrl,
        },
      });

      return {
        message: 'Gia hạn gói dịch vụ thành công',
        subscription,
      };
    });
  }

  async resolvePost(postId: number, user: JwtRequest['user']) {
    return await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: { user: true },
      });

      if (!post) {
        throw new NotFoundException('Không tìm thấy bài viết');
      }

      const isOwner = post.userId === user.userId;
      const isAdmin = user.role === Role.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện thao tác này',
        );
      }

      const updated = await tx.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.RESOLVED,
        },
      });

      return {
        message: 'Đã xác nhận hoàn thành bài viết',
        post: updated,
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

  async getFoundPosts(dto: FindAllPostsDto) {
    const page = parseInt(String(dto.page || 1));
    const limit = parseInt(String(dto.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      status: PostStatus.APPROVED,
      postType: PostType.FOUND,
    };

    const search = dto.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (dto.location) {
      where.location = { contains: dto.location };
    }

    if (dto.category) {
      where.category = dto.category;
    }

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          location: true,
          category: true,
          date: true,
          viewCount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
            },
            take: 1,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const processedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      description: post.description,
      location: post.location,
      category: post.category,
      date: post.date,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      user: post.user,
      thumbnail: post.media?.[0] || null,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
    }));

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

  async getResolvedPosts(dto: FindAllPostsDto) {
    const page = parseInt(String(dto.page || 1));
    const limit = parseInt(String(dto.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      status: PostStatus.RESOLVED,
    };

    if (dto.postType) {
      where.postType = dto.postType;
    }

    if (dto.userId) {
      where.userId = dto.userId;
    }

    const search = dto.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (dto.location) {
      where.location = { contains: dto.location };
    }

    if (dto.category) {
      where.category = dto.category;
    }

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }], // Sort by when they were resolved
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          postType: true,
          location: true,
          category: true,
          date: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true, // When it was resolved
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
            },
            take: 1,
          },
          postSubscriptions: {
            where: {
              status: SubscriptionStatus.ACTIVE,
            },
            select: {
              package: {
                select: {
                  name: true,
                  packageType: true,
                },
              },
              endDate: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const processedPosts = posts.map((post) => {
      const activeSubscription = post.postSubscriptions?.[0];

      let packageInfo: { name: string; type: string } | null = null;

      if (activeSubscription?.package) {
        packageInfo = {
          name: activeSubscription.package.name,
          type: activeSubscription.package.packageType,
        };
      }

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description,
        postType: post.postType,
        location: post.location,
        category: post.category,
        date: post.date,
        viewCount: post.viewCount,
        createdAt: post.createdAt,
        resolvedAt: post.updatedAt, // When it was marked as resolved
        user: post.user,
        thumbnail: post.media?.[0] || null,
        package: packageInfo,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
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

  async createPostComment(
    postId: number,
    userId: number,
    createCommentDto: CreatePostCommentDto,
  ) {
    const { content, parentId } = createCommentDto;

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        user: {
          connect: { id: userId },
        },
        post: {
          connect: { id: postId },
        },
        ...(parentId && {
          parent: {
            connect: { id: parentId },
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return comment;
  }

  async deletePostComment(commentId: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }
}
