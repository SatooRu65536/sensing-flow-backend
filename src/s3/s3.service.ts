import { Injectable } from '@nestjs/common';
import { AbortMultipartUploadCommand, CreateMultipartUploadCommand, S3Client } from '@aws-sdk/client-s3';
import { S3Key } from './s3.types';
import { fromIni } from '@aws-sdk/credential-providers';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION,
      credentials: process.env.ENV_DEV ? fromIni() : undefined,
    });
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

  async abortMultipartUpload(key: S3Key, uploadId: string) {
    return await this.s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  getSensorUploadKey(userId: string, uploadId: string): S3Key {
    return `sensor-uploads/${userId}/${uploadId}` as S3Key;
  }
}
