import { Module } from '@nestjs/common';
import { MultipartUploadController } from './multipart-upload.controller';
import { SensorUploadService } from './multipart-upload.service';
import { S3Module } from '@/s3/s3.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [S3Module, UsersModule],
  controllers: [MultipartUploadController],
  providers: [SensorUploadService],
})
export class SensorUploadModule {}
