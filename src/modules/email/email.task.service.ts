import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostStatus, PostType } from '@prisma/client';
import { PrismaService } from '~/prisma';
import { EmailService } from './email.service';

@Injectable()
export class EmailTaskService {
  private readonly logger = new Logger(EmailTaskService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Scheduled task to send expiration reminder emails
   * Runs at midnight every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sendExpirationReminders() {
    try {
      this.logger.log('Starting to send expiration reminder emails');

      // Get tomorrow's date for comparison (24 hours from now)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Set time to end of day
      tomorrow.setHours(23, 59, 59, 999);

      // Set today to start of day for range query
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all subscriptions expiring in the next 24 hours
      const expiringSubscriptions = await this.prisma.postSubscription.findMany(
        {
          where: {
            endDate: {
              gte: today,
              lte: tomorrow,
            },
            status: 'ACTIVE',
            post: {
              postType: PostType.LOST,
              status: PostStatus.APPROVED,
            },
          },
          include: {
            post: true,
            user: true,
          },
        },
      );

      this.logger.log(
        `Found ${expiringSubscriptions.length} expiring subscriptions`,
      );

      // Send reminder email for each expiring subscription
      for (const subscription of expiringSubscriptions) {
        await this.emailService.sendExpirationReminderEmail(
          subscription.user,
          subscription.post,
          subscription.endDate,
        );

        this.logger.log(
          `Sent expiration reminder for post ${subscription.post.id} to user ${subscription.user.email}`,
        );
      }

      this.logger.log('Finished sending expiration reminder emails');
    } catch (error) {
      this.logger.error('Error sending expiration reminder emails', error);
    }
  }
}
