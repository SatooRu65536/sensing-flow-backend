import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { AppModuleMock } from '@/app.module.mock';
import { createTestApp } from '@/common/utils/test/create-test-app';
import { seedUsers } from '@/_seed/users';
import { CreateUserRequest, CreateUserResponse, GetPlanResponse, GetUserResponse } from './users.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createUserPayload } from '@/common/utils/test/test-factories';
import plansConfig from '@/plans.json';

describe('Users', () => {
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;
  const userId = 'user-id-123';

  beforeAll(async () => {
    ({ app, authGuard } = await createTestApp({ imports: [AppModuleMock], usePermissionGuard: true }));
  });

  beforeEach(async () => {
    await seedUsers({ userIds: [userId] });
  });

  afterEach(() => {
    authGuard.resetUser();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('[201] ユーザ登録できる', async () => {
      const userPayload = createUserPayload();
      authGuard.setUser({ userPayload });
      const body: CreateUserRequest = {
        name: 'Test User',
        plan: 'trial',
      };

      const res = await request(app.getHttpServer()).post('/users').send(body);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(body);

      const dto = plainToInstance(CreateUserResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('[400] 選択できないプランの場合、エラーになる', async () => {
      // developer プランを選択不可に設定
      plansConfig.plans.developer.selectable = false;

      const userPayload = createUserPayload();
      authGuard.setUser({ userPayload });
      const body: CreateUserRequest = {
        name: 'Test User',
        plan: 'developer',
      };

      const res = await request(app.getHttpServer()).post('/users').send(body);

      expect(res.status).toBe(400);
    });

    it('[400] 既に登録済みのユーザの場合、エラーになる', async () => {
      const userPayload = createUserPayload({ sub: userId });
      authGuard.setUser({ userPayload });
      const body: CreateUserRequest = {
        name: 'Test User',
        plan: 'trial',
      };

      // 初回登録
      await request(app.getHttpServer()).post('/users').send(body);

      // 2回目登録
      const res = await request(app.getHttpServer()).post('/users').send(body);

      expect(res.status).toBe(400);
    });

    it('[400] リクエストボディが不正な場合、エラーになる', async () => {
      const userPayload = createUserPayload();
      authGuard.setUser({ userPayload });

      const res = await request(app.getHttpServer()).post('/users').send({ name: 12345 });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /me', () => {
    it('[200] 自分のユーザ情報を取得できる', async () => {
      const user = await authGuard.setExistingUser(userId);

      const res = await request(app.getHttpServer()).get('/users/me');

      expect(res.status).toBe(200);

      const dto = plainToInstance(GetUserResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(instanceToPlain(dto)).toStrictEqual({
        id: user.id,
        name: user.name,
        plan: user.plan,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });
  });

  describe('GET /plan', () => {
    it('[200] 自分のプラン情報を取得できる', async () => {
      const user = await authGuard.setExistingUser(userId);

      const res = await request(app.getHttpServer()).get('/users/plan');

      expect(res.status).toBe(200);

      const dto = plainToInstance(GetPlanResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(instanceToPlain(dto)).toStrictEqual({
        plan: user.plan,
      });
    });
  });
});
