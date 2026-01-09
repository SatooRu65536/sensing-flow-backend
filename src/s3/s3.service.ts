import { Injectable } from '@nestjs/common';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { S3Key } from './s3.types';
import { fromIni } from '@aws-sdk/credential-providers';
import { SensorUploadParts } from '@/multipart-upload/multipart-upload.model';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    switch (process.env.ENV) {
      case 'development':
        this.s3Client = new S3Client({
          region: process.env.S3_REGION,
          credentials: fromIni(),
        });
        break;
      case 'test':
        this.s3Client = new S3Client({
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
          forcePathStyle: true,
        });
        break;
      default:
        this.s3Client = new S3Client({
          region: process.env.S3_REGION,
        });
        break;
    }
    this.bucketName = process.env.S3_BUCKET_NAME!;
  }

  async putObject(key: S3Key, body: Buffer) {
    return await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: 'text/csv',
      }),
    );
  }

  async createMultipartUpload(key: S3Key) {
    return await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: 'text/csv',
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

  async getPresignedUrl(key: string, filename: string): Promise<string> {
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentType: 'text/csv',
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
      }),
      { expiresIn: 60 * 60 }, // 1 hour
    );
  }

  getSensorUploadKey(userId: string, uploadId: string): S3Key {
    return `sensor-uploads/${userId}/${uploadId}` as S3Key;
  }
}
