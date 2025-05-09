import { Module } from '@nestjs/common';
import { PrismaModule } from '~/prisma';
import { ExpiredChecksService } from './expired-checks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [ExpiredChecksService],
  exports: [ExpiredChecksService],
})
export class TasksModule {}
