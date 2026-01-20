import { SensorDataSchema } from '@/_schema';
import { db } from '@/database/database.module';
import { SensorDataInsertT } from '@/sensor-data/sensor-data.model';
import { folderS3KeySchema, sensorDataIdSchema, sensorDataNameSchema, UserId, userIdSchema } from '@/types/brand';

interface Options {
  count?: number;
  additional?: SensorDataInsertT[];
}
export async function seedSensorData(userIds: UserId[], options?: Options) {
  const count = (options?.count ?? 20) - (options?.additional?.length ?? 0);

  const inserted = await db
    .insert(SensorDataSchema)
    .values([
      ...userIds.flatMap((userId) =>
        Array.from({ length: count }).map(
          (_, index) =>
            ({
              userId,
              activeSensors: ['accelerometer', 'gyroscope'],
              dataName: sensorDataNameSchema.parse(`sensor-data-${index + 1}`),
              folderS3Key: folderS3KeySchema.parse(`upload/${userId}/sensor-data-${index + 1}`),
            }) satisfies SensorDataInsertT,
        ),
      ),
      ...(options?.additional?.map(
        (data) =>
          ({
            id: sensorDataIdSchema.parse(data.id),
            userId: userIdSchema.parse(data.userId),
            activeSensors: data.activeSensors,
            dataName: sensorDataNameSchema.parse(data.dataName),
            folderS3Key: folderS3KeySchema.parse(data.folderS3Key),
            createdAt: data.createdAt,
          }) satisfies SensorDataInsertT,
      ) ?? []),
    ])
    .$returningId();
  return inserted.map((row) => row.id);
}
