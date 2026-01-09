import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { AppModuleMock } from '@/app.module.mock';
import { createTestApp } from '@/common/utils/test/create-test-app';
import plansConfig from '@/plans.json';
import { seedUsers } from '@/_seed/users';

describe('RateLimit', () => {
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;
  const userId = 'user-id-123';

  beforeAll(async () => {
    ({ app, authGuard } = await createTestApp({ imports: [AppModuleMock], usePermissionGuard: true }));
  });

  beforeEach(async () => {
    await seedUsers({ userIds: [userId] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    authGuard.resetUser();
    vi.useRealTimers();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /rate-limit', () => {
    it('[200]x2→[429]→[200]→[429] レート制限(2/30secs)', async () => {
      // レートリミットを設定
      authGuard.setUser({ user: { id: userId, plan: 'developer' } });
      plansConfig.plans.developer.permissions = { 'test:rate_limit': '2/30secs' };

      // 時間を固定
      const now = Date.now();
      vi.setSystemTime(new Date(now));

      // 1回目
      const res1 = await request(app.getHttpServer()).get('/rate-limit/test');
      expect(res1.status).toBe(200);

      // 経過時間: 10秒
      vi.setSystemTime(new Date(now + 1000 * 10));

      // 2回目
      const res2 = await request(app.getHttpServer()).get('/rate-limit/test');
      expect(res2.status).toBe(200);

      // 3回目
      const res3 = await request(app.getHttpServer()).get('/rate-limit/test');
      expect(res3.status).toBe(429);

      // 経過時間: 31秒 (1回目のリクエストが制限時間外に)
      vi.setSystemTime(new Date(now + 1000 * 31));

      // 4回目
      const res4 = await request(app.getHttpServer()).get('/rate-limit/test');
      expect(res4.status).toBe(200);

      // 5回目
      const res5 = await request(app.getHttpServer()).get('/rate-limit/test');
      expect(res5.status).toBe(429);
    });
  });
});
