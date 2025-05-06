import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '~/prisma';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class ExpiredChecksService {
  private readonly logger = new Logger(ExpiredChecksService.name);

  constructor(
    private prisma: PrismaService,
    private postsService: PostsService,
  ) {}

  /**
   * Kiểm tra và cập nhật các gói dịch vụ hết hạn mỗi ngày lúc 00:01
   */
  @Cron('1 0 * * *')
  async checkExpiredSubscriptions() {
    this.logger.log('Running expired subscriptions check');

    const now = new Date();

    // Tìm các gói đăng ký đã hết hạn nhưng vẫn trong trạng thái Active
    const expiredSubscriptions = await this.prisma.postSubscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lt: now,
        },
      },
      select: {
        id: true,
        postId: true,
      },
    });

    if (expiredSubscriptions.length > 0) {
      this.logger.log(
        `Found ${expiredSubscriptions.length} expired subscriptions`,
      );

      // Cập nhật trạng thái subscriptions
      await this.prisma.postSubscription.updateMany({
        where: {
          id: {
            in: expiredSubscriptions.map((sub) => sub.id),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      // Gửi thông báo cho người dùng (có thể thêm code ở đây)

      this.logger.log(
        `Updated ${expiredSubscriptions.length} expired subscriptions`,
      );
    } else {
      this.logger.log('No expired subscriptions found');
    }
  }

  /**
   * Kiểm tra và cập nhật đẩy tin hết hạn mỗi giờ
   */
  @Cron('0 * * * *')
  async checkExpiredBoosts() {
    this.logger.log('Running expired boosts check');
    await this.postsService.checkAndUpdateExpiredBoosts();
  }
}
