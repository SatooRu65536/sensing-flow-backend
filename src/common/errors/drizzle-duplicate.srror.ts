import { DrizzleQueryError } from 'drizzle-orm';
import { CustomMySQLError } from './custom-mysql.error';

export class DrizzleDuplicateError extends DrizzleQueryError {
  constructor() {
    super('Duplicate entry', [], new CustomMySQLError('ER_DUP_ENTRY'));
  }
}
