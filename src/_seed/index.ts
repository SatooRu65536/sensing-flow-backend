import { seedSensorData } from './sensor-data';
import { seedSensorUploads } from './sensor-upload';
import { seedUsers } from './users';

export async function seed() {
  const userIds = await seedUsers();
  await seedSensorUploads(userIds, { count: 20 });
  await seedSensorUploads(userIds, { count: 20 });
  await seedSensorData(userIds, { count: 20 });
}
