import { Test, TestingModule } from '@nestjs/testing';
import { PermissionGuard } from './permission.guard';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '@/rate-limit/rate-limit.service';
import plansJson from '../plans.json';
import { createContext, createReflectorMock } from '@/utils/test/execution-context';
import { createDbServiceMock, DbMock } from '@/utils/test/service-mocks';
import { createUser } from '@/utils/test/test-factories';
import { PlansConfigRaw } from '@/plans-config/plans-config.schema';
import { InternalServerErrorException } from '@nestjs/common';
import { TooManyRequestsException } from '@/common/exceptions/too-many-request.exception';

const plans = plansJson as PlansConfigRaw;

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let rateLimitService: RateLimitService;
  let dbMock: DbMock;

  beforeEach(async () => {
    reflector = createReflectorMock();
    dbMock = createDbServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: 'DRIZZLE_DB',
          useValue: dbMock,
        },
      ],
    }).compile();

    rateLimitService = module.get<RateLimitService>(RateLimitService);
    guard = new PermissionGuard(reflector, rateLimitService);
  });

  it('requiredPermission がない場合は true を返す（user がある場合）', async () => {
    const user = createUser();
    const ctx = createContext({ user });

    vi.spyOn(reflector, 'get').mockReturnValue(undefined);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('requiredPermission がない場合は true を返す（user がない場合）', async () => {
    const ctx = createContext();

    vi.spyOn(reflector, 'get').mockReturnValue(undefined);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('user がない場合は false を返す', async () => {
    const ctx = createContext();

    vi.spyOn(reflector, 'get').mockReturnValue('read:data');

    const result = await guard.canActivate(ctx);
    expect(result).toBe(false);
  });

  it('プランに権限がない場合は false を返す', async () => {
    const user = createUser({ plan: 'trial' });
    const ctx = createContext({ user });

    vi.spyOn(reflector, 'get').mockReturnValue('write:data');

    const result = await guard.canActivate(ctx);
    expect(result).toBe(false);
  });

  it('権限が "*" の場合は true を返す', async () => {
    const user = createUser({ plan: 'developer' });
    const ctx = createContext({ user });

    vi.spyOn(reflector, 'get').mockReturnValue('any:perm');
    plans.plans.developer.permissions = { '*': '*' }; // 全権限

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('rateLimitString が不正の場合は InternalServerErrorException', async () => {
    const user = createUser({ plan: 'developer' });
    const ctx = createContext({ user });

    vi.spyOn(reflector, 'get').mockReturnValue('read:data');
    plans.plans.developer.permissions = { 'read:data': 'invalid-string' };

    await expect(guard.canActivate(ctx)).rejects.toThrow(InternalServerErrorException);
  });

  it('レートリミットを超えた場合は TooManyRequestsException を投げる', async () => {
    const user = createUser({ plan: 'developer' });
    const ctx = createContext({ user });

    vi.spyOn(reflector, 'get').mockReturnValue('read:data');
    plans.plans.developer.permissions = { 'read:data': '10/min' };

    vi.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(false);

    await expect(guard.canActivate(ctx)).rejects.toThrow(TooManyRequestsException);
  });

  it('レートリミット内の場合は true を返す & ログが呼ばれる', async () => {
    const user = createUser({ plan: 'developer' });
    const ctx = createContext({ user });

    vi.spyOn(reflector, 'get').mockReturnValue('read:data');
    plans.plans.developer.permissions = { 'read:data': '10/min' };

    vi.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue(true);
    const logSpy = vi.spyOn(rateLimitService, 'logRateLimit').mockResolvedValue(undefined);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(user, 'read:data');
  });
});
