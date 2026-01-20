import { UserPayload } from '@/auth/jwt.schema';
import { userIdSchema, userNameSchema, userSubSchema } from '@/types/brand';
import { User } from '@/users/users.dto';

export function createUserPayload(overrides?: Partial<UserPayload>): UserPayload {
  return {
    sub: userSubSchema.parse('sub_example'),
    iss: 'sensing-flow',
    ...overrides,
  };
}

export function createUser(overrides?: Partial<User>): User {
  return {
    id: userIdSchema.parse('user_id_1'),
    sub: userSubSchema.parse('sub_example'),
    name: userNameSchema.parse('Test User'),
    plan: 'basic',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
