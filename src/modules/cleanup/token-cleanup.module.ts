import { Module } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { TokenCleanupService } from './token-cleanup.service';

@Module({
  providers: [TokenCleanupService, PrismaService],
})
export class TokenCleanupModule {}
