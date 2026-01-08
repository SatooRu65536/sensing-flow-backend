import { SensorUploadSchema } from '@/_schema';
import { db } from '@/database/database.module';
import { SensorUploadRecordT, sensorUploadStatusOptions } from '@/multipart-upload/multipart-upload.model';

interface Options {
  count?: number;
  additional?: SensorUploadRecordT[];
}
export async function seedSensorUploads(userIds: string[], { count, additional }: Options) {
  await db.insert(SensorUploadSchema).values([
    ...userIds.flatMap((userId) =>
      Array.from({ length: count ?? 20 }).map((_, index) => ({
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
    ...(additional ?? []),
  ]);
}
