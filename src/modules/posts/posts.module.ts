import { Module } from '@nestjs/common';
import { EmailModule } from '~/modules/email/email.module';
import { PrismaService } from '~/prisma/prisma.service';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [EmailModule],
  controllers: [PostsController],
  providers: [PostsService, PrismaService],
})
export class PostsModule {}
