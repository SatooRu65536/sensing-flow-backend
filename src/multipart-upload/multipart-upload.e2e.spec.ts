import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { AppModuleMock } from '@/app.module.mock';
import { createTestApp } from '@/utils/test/create-test-app';
import { seedUsers } from '@/_seed/users';
import { seedSensorUploads } from '@/_seed/sensor-upload';
import { plainToInstance } from 'class-transformer';
import {
  ListMultipartUploadResponse,
  StartMultipartUploadRequest,
  StartMultipartUploadResponse,
} from './multipart-upload.dto';
import { validate } from 'class-validator';

describe('MultipartUploadModule', () => {
  const userId = 'test-user-id';
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;

  beforeAll(async () => {
    ({ app, authGuard } = await createTestApp([AppModuleMock]));
  });

  beforeEach(async () => {
    const userIds = await seedUsers({ userIds: [userId] });
    await seedSensorUploads(userIds, { count: 20 });
  });

  afterEach(() => {
    authGuard.resetUser();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /sensor-upload', () => {
    it('[200] 取得できる', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).get('/sensor-upload');

      expect(res.status).toBe(200);

      const dto = plainToInstance(ListMultipartUploadResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('POST /sensor-upload', () => {
    it('[201] 開始できる', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .post('/sensor-upload')
        .send({ dataName: 'test-data' } satisfies StartMultipartUploadRequest);

      expect(res.status).toBe(201);

      const dto = plainToInstance(StartMultipartUploadResponse, res.body);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('[400] リクエストボディがない場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).post('/sensor-upload');

      expect(res.status).toBe(400);
    });

    it('[400] リクエストボディが空の場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).post('/sensor-upload').send({});

      expect(res.status).toBe(400);
    });
  });
});
