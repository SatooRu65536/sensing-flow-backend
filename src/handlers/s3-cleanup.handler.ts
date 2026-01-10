import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '@/_schema';
import { and, eq, inArray, lte } from 'drizzle-orm';
import { MultipartUploadStatusEnum } from '@/multipart-upload/multipart-upload.model';
import { S3Service } from '@/s3/s3.service';
import { MultipartUploadIdentifier, S3Key } from '@/s3/s3.types';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined) throw new Error('DATABASE_URL is not defined');

const db = drizzle(DATABASE_URL, { schema, mode: 'default' });

export const handler = async () => {
  const s3Service = new S3Service();

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // DBから一定時間以上更新されていない未完了のマルチパートアップロードを削除
  try {
    const multipartUploadRecords = await db.query.MultipartUploadSchema.findMany({
      where: and(
        eq(schema.MultipartUploadSchema.status, MultipartUploadStatusEnum.IN_PROGRESS),
        lte(schema.MultipartUploadSchema.updatedAt, new Date(now - oneHour)),
      ),
    });
    const muIdsFromDb: MultipartUploadIdentifier[] = multipartUploadRecords.map((record) => ({
      id: record.id,
      key: s3Service.getUploadS3Key(record.userId, record.id),
      uploadId: record.s3uploadId,
    }));
    const { succeeded } = await s3Service.abortMultipartUploads(muIdsFromDb);
    await db
      .update(schema.MultipartUploadSchema)
      .set({ status: MultipartUploadStatusEnum.ABORTED })
      .where(
        and(
          inArray(
            schema.MultipartUploadSchema.id,
            succeeded.map((u) => u.id),
          ),
        ),
      );
  } catch (e) {
    console.error('DB cleanup failed', e);
  }

  // S3上の一定時間以上更新されていない未完了のマルチパートアップロードを削除
  try {
    const multipartUploads = await s3Service.listMultipartUpload();
    if (!multipartUploads.Uploads) return;
    const muIdsFromS3: MultipartUploadIdentifier[] = multipartUploads.Uploads.filter(
      (u) => u.Key && u.UploadId && u.Initiated,
    )
      .filter((u) => u.Initiated!.getTime() < now - oneHour)
      .map((upload) => ({
        id: upload.Key! + ':' + upload.UploadId!,
        key: upload.Key as S3Key,
        uploadId: upload.UploadId!,
      }));
    await s3Service.abortMultipartUploads(muIdsFromS3);
  } catch (e) {
    console.error('S3 cleanup failed', e);
  }
};
