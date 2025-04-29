import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '~/prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TokenCleanupModule } from './modules/cleanup/token-cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TokenCleanupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
