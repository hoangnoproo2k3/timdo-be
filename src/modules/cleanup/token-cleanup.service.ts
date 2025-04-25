import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredTokens() {
    try {
      const deleted = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lte: new Date() },
        },
      });
      console.log(`Deleted ${deleted.count} expired refresh tokens`);
      this.logger.log(`Deleted ${deleted.count} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Failed to clean expired refresh tokens', error);
    }
  }
}
