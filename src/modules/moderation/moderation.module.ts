import { Module } from '@nestjs/common';
import { PrismaModule } from '~/prisma';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
