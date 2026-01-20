import { Injectable } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileName, FileS3Key, FolderS3Key, SensorDataId, UserId } from '@/types/brand';

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

  async putObject(key: FileS3Key, body: Buffer) {
    return await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: 'text/csv',
      }),
    );
  }

  async deleteObject(key: string) {
    return await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
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

  /**
   * フォルダを指すS3キーを生成する(DB保存用)
   * @example sensor-data/{userId}/{YYYY-MM}/{sensorDataId}/
   */
  generateFolderS3Key(userId: UserId, sensorDataId: SensorDataId): FolderS3Key {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}-${month}`;
    return `sensor-data/${userId}/${yearMonth}/${sensorDataId}/` as FolderS3Key;
  }

  /**
   * 個々のファイルを指すS3キーを生成する(S3操作用)
   * @example sensor-data/{userId}/{YYYY-MM}/{sensorDataId}/{filename}
   */
  generateFileS3Key(userId: UserId, sensorDataId: SensorDataId, filename: FileName): FileS3Key {
    const folderKey = this.generateFolderS3Key(userId, sensorDataId);
    return `${folderKey}${filename}` as FileS3Key;
  }

  folderToFileS3Key(folderKey: FolderS3Key, filename: FileName): FileS3Key {
    return `${folderKey}${filename}` as FileS3Key;
  }

  fileToFolderS3Key(fileKey: FileS3Key): FolderS3Key {
    const parts = fileKey.split('/');
    parts.pop();
    return (parts.join('/') + '/') as FolderS3Key;
  }
}
