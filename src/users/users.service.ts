import { Inject, Injectable } from '@nestjs/common';
import type { DbType } from '../database/database.module';

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE_DB') private db: DbType) {}
}
