import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '~/prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { TokenCleanupModule } from './modules/cleanup/token-cleanup.module';
import { EmailModule } from './modules/email/email.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { PostsModule } from './modules/posts/posts.module';
import { S3Module } from './modules/s3/s3.module';
import { ServicesModule } from './modules/services/services.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TokenCleanupModule,
    PostsModule,
    S3Module,
    ServicesModule,
    TasksModule,
    ModerationModule,
    BlogsModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
