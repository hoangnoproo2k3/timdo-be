import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '~/prisma';

@Injectable()
export class ExpiredChecksService {
  private readonly logger = new Logger(ExpiredChecksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Kiểm tra và cập nhật các gói dịch vụ hết hạn mỗi ngày lúc 00:01
   */
  @Cron('1 0 * * *')
  async checkExpiredSubscriptions() {
    const now = new Date();
    this.logger.log(
      '🕒 Running expired subscriptions check at: ' + now.toISOString(),
    );

    try {
      const expiredSubscriptions = await this.prisma.postSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: { lt: now },
        },
        select: {
          id: true,
          postId: true,
          endDate: true,
        },
      });

      const expiredCount = expiredSubscriptions.length;
      this.logger.log(`✅ Found ${expiredCount} expired subscriptions`);

      if (expiredCount > 0) {
        const idsToUpdate = expiredSubscriptions.map((sub) => sub.id);

        const result = await this.prisma.postSubscription.updateMany({
          where: { id: { in: idsToUpdate } },
          data: { status: SubscriptionStatus.EXPIRED },
        });

        this.logger.log(
          `🔄 Updated ${result.count} subscriptions to EXPIRED status`,
        );
      } else {
        this.logger.log('📭 No expired subscriptions found');
      }
    } catch (error) {
      this.logger.error('❌ Error while checking expired subscriptions', error);
    }
  }

  /**
   * Kiểm tra và cập nhật đẩy tin hết hạn mỗi giờ
   */
  @Cron('0 * * * *')
  async checkExpiredBoosts() {
    const now = new Date();
    this.logger.log('🕒 Running expired boosts check at: ' + now.toISOString());

    try {
      const expiredBoosts = await this.prisma.post.findMany({
        where: {
          isBoosted: true,
          boostUntil: { lt: now },
        },
        select: { id: true },
      });

      const expiredPostIds = expiredBoosts.map((post) => post.id);

      if (expiredPostIds.length > 0) {
        const postUpdateResult = await this.prisma.post.updateMany({
          where: { id: { in: expiredPostIds } },
          data: { isBoosted: false },
        });

        const transactionUpdateResult =
          await this.prisma.boostTransaction.updateMany({
            where: {
              postId: { in: expiredPostIds },
              endDate: { lt: now },
              isActive: true,
            },
            data: { isActive: false },
          });

        this.logger.log(
          `✅ Updated ${postUpdateResult.count} expired boosted posts`,
        );
        this.logger.log(
          `🔄 Updated ${transactionUpdateResult.count} boost transactions to inactive`,
        );
      } else {
        this.logger.log('📭 No expired boosted posts found');
      }

      this.logger.log('✅ Boosts check completed');
    } catch (error) {
      this.logger.error('❌ Error while checking expired boosts', error);
    }
  }
}
