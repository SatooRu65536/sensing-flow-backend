import { Injectable } from '@nestjs/common';
import { CreateMultipartUploadCommand, S3Client } from '@aws-sdk/client-s3';
import { S3Key } from './s3.types';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.s3Client = new S3Client({});
    this.bucketName = process.env.S3_BUCKET_NAME!;
  }

  async createMultipartUpload(key: S3Key) {
    return await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  getSensorUploadKey(userId: string, uploadId: string): S3Key {
    return `sensor-uploads/${userId}/${uploadId}` as S3Key;
  }
}
