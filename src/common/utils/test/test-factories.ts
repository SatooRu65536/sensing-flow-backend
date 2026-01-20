import { UserPayload } from '@/auth/jwt.schema';
import { SensorDataRecordT } from '@/sensor-data/sensor-data.model';
import {
  folderS3KeySchema,
  sensorDataIdSchema,
  sensorDataNameSchema,
  userIdSchema,
  userNameSchema,
  userSubSchema,
} from '@/types/brand';
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

export function createSensorData(overrides?: Partial<SensorDataRecordT>): SensorDataRecordT {
  return {
    id: sensorDataIdSchema.parse('00000000-0000-0000-0000-000000000001'),
    userId: userIdSchema.parse('user_id_1'),
    dataName: sensorDataNameSchema.parse('Test Data'),
    folderS3Key: folderS3KeySchema.parse('s3/key/for/test_data.csv'),
    createdAt: new Date(),
    updatedAt: new Date(),
    activeSensors: ['accelerometer', 'gyroscope'],
    ...overrides,
  };
}

export function makeFile(name: string, body: string = 'test'): Express.Multer.File {
  return { originalname: name, buffer: Buffer.from(body) } as Express.Multer.File;
}
