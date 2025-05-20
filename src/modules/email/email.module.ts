import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '~/prisma/prisma.module';
import { EmailService } from './email.service';
import { EmailTaskService } from './email.task.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), PrismaModule],
  providers: [EmailService, EmailTaskService],
  exports: [EmailService],
})
export class EmailModule {}
