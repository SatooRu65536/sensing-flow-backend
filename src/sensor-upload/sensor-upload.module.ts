import { Module } from '@nestjs/common';
import { SensorUploadController } from './sensor-upload.controller';
import { SensorUploadService } from './sensor-upload.service';
import { S3Module } from '@/s3/s3.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [S3Module, UsersModule],
  controllers: [SensorUploadController],
  providers: [SensorUploadService],
})
export class SensorUploadModule {}
