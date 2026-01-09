import { MultipartUploadSchema } from '@/_schema';
import { db } from '@/database/database.module';
import { SensorUploadInsertT, sensorUploadStatusOptions } from '@/multipart-upload/multipart-upload.model';

interface Options {
  count?: number;
  additional?: SensorUploadInsertT[];
}
export async function seedMultipartUploads(userIds: string[], options?: Options) {
  const count = (options?.count ?? 20) - (options?.additional?.length ?? 0);

  const inserted = await db
    .insert(MultipartUploadSchema)
    .values([
      ...userIds.flatMap((userId) =>
        Array.from({ length: count }).map((_, index) => ({
          userId,
          parts: Array.from({ length: index }).map((_, partIndex) => ({
            partNumber: partIndex + 1,
            etag: `etag-${partIndex + 1}`,
          })),
          dataName: `sensor-upload-${index + 1}`,
          s3uploadId: `s3-upload-${userId}-${index + 1}`,
          status: sensorUploadStatusOptions.at(index) ?? 'in_progress',
        })),
      ),
      ...(options?.additional ?? []),
    ])
    .$returningId();
  return inserted.map((row) => row.id);
}
