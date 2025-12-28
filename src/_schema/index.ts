import { mysqlTable } from 'drizzle-orm/mysql-core';
import { datetime } from 'drizzle-orm/mysql-core';
import { varchar } from 'drizzle-orm/mysql-core';
import { v4 } from 'uuid';

const uuid = () =>
  varchar({ length: 36 })
    .notNull()
    .$defaultFn(() => v4());
const createdAt = () =>
  datetime({ mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  datetime({ mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const UserSchema = mysqlTable('users', {
  id: uuid().primaryKey(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
