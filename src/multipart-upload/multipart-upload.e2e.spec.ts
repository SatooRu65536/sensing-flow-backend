import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { AppModuleMock } from '@/app.module.mock';
import { createTestApp } from '@/utils/test/create-test-app';

describe('MultipartUploadModule', () => {
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;

  beforeAll(async () => {
    ({ app, authGuard } = await createTestApp([AppModuleMock]));
  });

  afterEach(() => {
    authGuard.resetUser();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[200] GET /sensor-upload', async () => {
    authGuard.setUser({ user: { plan: 'admin' } });
    const res = await request(app.getHttpServer()).get('/sensor-upload');
    expect(res.status).toBe(200);
  });
});
