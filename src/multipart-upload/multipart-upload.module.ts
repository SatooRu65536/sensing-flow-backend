import { Module } from '@nestjs/common';
import { MultipartUploadController } from './multipart-upload.controller';
import { MultipartUploadService } from './multipart-upload.service';
import { S3Module } from '@/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [MultipartUploadController],
  providers: [MultipartUploadService],
})
export class SensorUploadModule {}
