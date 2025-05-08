import { Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '~/common/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExpiredChecksService } from './expired-checks.service';

@Controller('v1/admin/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TasksController {
  constructor(private readonly expiredChecksService: ExpiredChecksService) {}

  @Post('check-expired-subscriptions')
  async checkExpiredSubscriptions() {
    const result = await this.expiredChecksService.checkExpiredSubscriptions();
    return {
      message: 'Expired subscriptions check completed',
      result,
    };
  }

  @Post('check-expired-boosts')
  async checkExpiredBoosts() {
    const result = await this.expiredChecksService.checkExpiredBoosts();
    return {
      message: 'Expired boosts check completed',
      result,
    };
  }

  @Post('check-all')
  async checkAll() {
    const [subscriptionsResult, boostsResult] = await Promise.all([
      this.expiredChecksService.checkExpiredSubscriptions(),
      this.expiredChecksService.checkExpiredBoosts(),
    ]);

    return {
      message: 'All checks completed',
      results: {
        subscriptions: subscriptionsResult,
        boosts: boostsResult,
      },
    };
  }
}
