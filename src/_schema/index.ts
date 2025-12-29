import { json, mysqlTable } from 'drizzle-orm/mysql-core';
import { datetime } from 'drizzle-orm/mysql-core';
import { varchar } from 'drizzle-orm/mysql-core';
import { v4 } from 'uuid';

const uuid = (key: string) =>
  varchar(key, { length: 36 })
    .notNull()
    .$defaultFn(() => v4());
const createdAt = (key: string = 'created_at') =>
  datetime(key, { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = (key: string = 'updated_at') =>
  datetime(key, { mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const UserSchema = mysqlTable('users', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sub: varchar('sub', { length: 255 }).notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const SensorUploadSchema = mysqlTable('sensor_uploads', {
  id: uuid('id').primaryKey(),
  uploadId: varchar('upload_id', { length: 255 }).notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => UserSchema.id),
  dataName: varchar('data_name', { length: 255 }).notNull(),
  parts: json('parts').$type<{ partNumber: number; etag: string }[]>().notNull(),
  status: varchar('status', { enum: ['in_progress', 'completed', 'aborted'], length: 16 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
