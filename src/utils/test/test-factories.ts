import { UserPayload } from '@/auth/jwt.schema';
import { SensorUpload } from '@/multipart-upload/multipart-upload.model';
import { User } from '@/users/users.dto';

export function createUserPayload(overrides?: Partial<UserPayload>): UserPayload {
  return {
    sub: 'sub_example',
    aud: 'sensing-flow',
    iss: 'sensing-flow',
    email: 'taro@example.com',
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

export function createSensorUpload(overrides?: Partial<SensorUpload>): SensorUpload {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    s3uploadId: 's3_upload_id_1',
    userId: 'user_id_1',
    dataName: 'Test Data',
    status: 'in_progress',
    parts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
