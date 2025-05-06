import { Module } from '@nestjs/common';
import { PrismaModule } from '~/prisma';
import { PostsModule } from '../posts/posts.module';
import { PostsService } from '../posts/posts.service';
import { ExpiredChecksService } from './expired-checks.service';

@Module({
  imports: [PrismaModule, PostsModule],
  providers: [ExpiredChecksService, PostsService],
})
export class TasksModule {}
