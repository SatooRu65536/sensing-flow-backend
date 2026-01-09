import { SensorDataSchema } from '@/_schema';
import { db } from '@/database/database.module';
import { SensorDataInsertT } from '@/sensor-data/sensor-data.model';

interface Options {
  count?: number;
  additional?: SensorDataInsertT[];
}
export async function seedSensorData(userIds: string[], options?: Options) {
  const count = (options?.count ?? 20) - (options?.additional?.length ?? 0);

  const inserted = await db
    .insert(SensorDataSchema)
    .values([
      ...userIds.flatMap((userId) =>
        Array.from({ length: count }).map((_, index) => ({
          userId,
          dataName: `sensor-data-${index + 1}`,
          s3key: `upload/${userId}/sensor-data-${index + 1}`,
        })),
      ),
      ...(options?.additional ?? []),
    ])
    .$returningId();
  return inserted.map((row) => row.id);
}
