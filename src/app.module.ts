import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './auth/permission.guard';
import { S3Module } from './s3/s3.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [AuthModule, S3Module, DatabaseModule, UsersModule, RateLimitModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
