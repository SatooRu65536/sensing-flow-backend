import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '@/_schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined) throw new Error('DATABASE_URL is not defined');

export const db = drizzle(DATABASE_URL, { schema, mode: 'default' });
export type DbType = typeof db;

@Global()
@Module({
  providers: [
    {
      provide: 'DRIZZLE_DB',
      useValue: db,
    },
  ],
  exports: ['DRIZZLE_DB'],
})
export class DatabaseModule {}
