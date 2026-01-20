import { UserPayload } from '@/auth/jwt.schema';
import { User } from '@/users/users.dto';

export function createUserPayload(overrides?: Partial<UserPayload>): UserPayload {
  return {
    sub: 'sub_example',
    iss: 'sensing-flow',
    ...overrides,
  };
}

export function createUser(overrides?: Partial<User>): User {
  return {
    id: 'user_id_1',
    sub: 'sub_example',
    name: 'Test User',
    plan: 'basic',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
