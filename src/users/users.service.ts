import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { DbType } from '../database/database.module';
import { CreateUserRequest, CreateUserResponse, GetPlanResponse, GetUserResponse, User } from './users.dto';
import { UserSchema } from '@/_schema';
import { eq } from 'drizzle-orm';
import { ErrorCodeEnum, handleDrizzleError } from '@/utils/drizzle-error';
import plansConfig from '@/plans.json';

@Injectable()
export class UsersService {
  constructor(@Inject('DRIZZLE_DB') private db: DbType) {}

  async createUser(user: User, body: CreateUserRequest): Promise<CreateUserResponse> {
    const selectable = plansConfig.plans[body.plan].selectable;

    if (!selectable) {
      throw new BadRequestException('選択できないプランです');
    }

    try {
      const userRecords = await this.db
        .insert(UserSchema)
        .values({
          sub: user.sub,
          name: body.name,
          plan: body.plan,
        })
        .$returningId();

      if (userRecords.length === 0) {
        throw new InternalServerErrorException('Failed to create user');
      }

      const userRecord = userRecords[0];

      return {
        id: userRecord.id,
        name: body.name,
        plan: body.plan,
      };
    } catch (e) {
      const error = handleDrizzleError(e);
      switch (error.code) {
        case ErrorCodeEnum.DUPLICATE_ENTRY:
          throw new BadRequestException('登録済みのユーザーです', { cause: error });
        default:
          console.error(error.cause);
          throw new InternalServerErrorException('Failed to create user', { cause: error });
      }
    }
  }

  getMe(user: User): GetUserResponse {
    return {
      id: user.id,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  getPlan(user: User): GetPlanResponse {
    return { plan: user.plan };
  }

  async getUserBySub(sub: string): Promise<User> {
    const userRecord = await this.db.query.UserSchema.findFirst({ where: eq(UserSchema.sub, sub) });

    if (userRecord == null) {
      throw new NotFoundException('User not found');
    }

    return userRecord;
  }
}
