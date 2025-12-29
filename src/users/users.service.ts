import { Inject, Injectable } from '@nestjs/common';
import type { DbType } from '../database/database.module';
import { UserPayload } from '@/auth/jwt.schema';
import { GetPlanResponse } from './users.dto';

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE_DB') private db: DbType) {}

  getPlan(user: UserPayload): GetPlanResponse {
    return { plan: user.plan };
  }
}
