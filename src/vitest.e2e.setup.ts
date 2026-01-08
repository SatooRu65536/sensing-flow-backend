import { db } from './database/database.module';
import * as schema from '@/_schema';

async function resetDb() {
  await db.delete(schema.SensorDataSchema);
  await db.delete(schema.MultipartUploadSchema);
  await db.delete(schema.RateLimitLogSchema);
  await db.delete(schema.UserSchema);
}

beforeAll(async () => {
  // 全テスト開始前にDBを初期化
  await resetDb();
});

afterEach(async () => {
  // 各テスト後にDBを初期化
  await resetDb();
});
