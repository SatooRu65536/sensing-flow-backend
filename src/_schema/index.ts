import { SensorsEnum } from '@/sensor-data/sensor-data.schema';
import {
  FolderS3Key,
  Permission,
  RateLimitLogId,
  SensorDataId,
  SensorDataName,
  UserId,
  UserName,
  UserSub,
} from '@/types/brand';
import { json, mysqlTable, varchar, datetime } from 'drizzle-orm/mysql-core';
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
  id: uuid('id').primaryKey().$type<UserId>(),
  name: varchar('name', { length: 255 }).notNull().$type<UserName>(),
  sub: varchar('sub', { length: 255 }).notNull().unique().$type<UserSub>(),
  plan: varchar('plan', { enum: ['guest', 'trial', 'basic', 'pro', 'admin', 'developer'], length: 16 }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const SensorDataSchema = mysqlTable('sensor_data', {
  id: uuid('id').primaryKey().$type<SensorDataId>(),
  userId: uuid('user_id')
    .notNull()
    .references(() => UserSchema.id)
    .$type<UserId>(),
  dataName: varchar('data_name', { length: 255 }).notNull().$type<SensorDataName>(),
  folderS3Key: varchar('folder_s3_key', { length: 255 }).notNull().$type<FolderS3Key>(),
  activeSensors: json('active_sensors').notNull().$type<SensorsEnum[]>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const RateLimitLogSchema = mysqlTable('rate_limit_logs', {
  id: uuid('id').primaryKey().$type<RateLimitLogId>(),
  userId: uuid('user_id')
    .notNull()
    .references(() => UserSchema.id)
    .$type<UserId>(),
  permission: varchar('permission', { length: 255 }).notNull().$type<Permission>(),
  timestamp: datetime('timestamp', { mode: 'date' }).notNull(),
});
