import { seedSensorData } from './sensor-data';
import { seedMultipartUploads } from './multipart-upload';
import { seedUsers } from './users';

export async function seed() {
  const userIds = await seedUsers();
  await seedMultipartUploads(userIds, { count: 20 });
  await seedMultipartUploads(userIds, { count: 20 });
  await seedSensorData(userIds, { count: 20 });
}
