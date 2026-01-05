import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UsersService } from './users/users.service';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './auth/permission.guard';
import { SensorUploadModule } from './multipart-upload/multipart-upload.module';
import { S3Module } from './s3/s3.module';
import { SensorDataController } from './sensor-data/sensor-data.controller';
import { SensorDataService } from './sensor-data/sensor-data.service';
import { SensorDataModule } from './sensor-data/sensor-data.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [AuthModule, DatabaseModule, UsersModule, SensorUploadModule, S3Module, SensorDataModule],
  controllers: [AppController, SensorDataController],
  providers: [
    AppService,
    UsersService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    SensorDataService,
  ],
})
export class AppModule {}
