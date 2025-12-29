import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UsersService } from './users/users.service';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { SensorUploadModule } from './sensor-upload/sensor-upload.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [AuthModule, DatabaseModule, UsersModule, SensorUploadModule, S3Module],
  controllers: [AppController],
  providers: [
    AppService,
    UsersService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard('jwt'),
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
