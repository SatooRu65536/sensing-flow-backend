import { SensorDataSchema } from '@/_schema';
import { db } from '@/database/database.module';

interface Options {
  count?: number;
}
export async function seedSensorData(userIds: string[], { count }: Options) {
  await db.insert(SensorDataSchema).values(
    userIds.flatMap((userId) =>
      Array.from({ length: count ?? 20 }).map((_, index) => ({
        userId,
        dataName: `sensor-data-${index + 1}`,
        s3key: `upload/${userId}/sensor-data-${index + 1}`,
      })),
    ),
  );
}
