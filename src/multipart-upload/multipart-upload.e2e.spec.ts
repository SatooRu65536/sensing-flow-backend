import request from 'supertest';
import { App } from 'supertest/types';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard';
import { AppModuleMock } from '@/app.module';

describe('MultipartUploadModule', () => {
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModuleMock],
      providers: [
        {
          provide: APP_GUARD,
          inject: [Reflector],
          useFactory: (reflector: Reflector) => {
            authGuard = new JwtAuthGuardMock(reflector);
            return authGuard;
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
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
