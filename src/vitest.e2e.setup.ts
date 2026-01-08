import { db } from './database/database.module';
import * as schema from '@/_schema';

async function resetDb() {
  await Promise.all(Object.values(schema).map((table) => db.delete(table)));
}

beforeAll(async () => {
  // 各テスト後にDBを初期化
  await resetDb();
});
