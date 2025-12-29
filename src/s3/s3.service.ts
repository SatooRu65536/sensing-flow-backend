import { Injectable } from '@nestjs/common';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { S3Key } from './s3.types';
import { fromIni } from '@aws-sdk/credential-providers';
import { SensorUploadParts } from '@/sensor-upload/sensor-upload.model';

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

  async postMultipartUpload(key: S3Key, uploadId: string, partNumber: number, chunkBase64: string) {
    return await this.s3Client.send(
      new UploadPartCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: Buffer.from(chunkBase64, 'base64'),
      }),
    );
  }

  async completeMultipartUpload(key: S3Key, uploadId: string, parts: SensorUploadParts) {
    return this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts.map(({ etag, partNumber }) => ({ PartNumber: partNumber, ETag: etag })) },
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
