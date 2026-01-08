import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '@/users/users.service';
import { MockInstance } from 'vitest';
import { createContext, createReflectorMock, ReflectorMock } from '@/utils/test/execution-context';
import { createDbServiceMock, DbMock } from '@/utils/test/service-mocks';
import { createUser, createUserPayload } from '@/utils/test/test-factories';
import { of } from 'rxjs';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: ReflectorMock;
  let usersService: UsersService;
  let dbMock: DbMock;
  let spySuperCanActivate: MockInstance;

  beforeEach(async () => {
    reflector = createReflectorMock();
    dbMock = createDbServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'DRIZZLE_DB',
          useValue: dbMock,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);

    guard = new JwtAuthGuard(reflector, usersService);

    // AuthGuard('jwt') の canActivate を上書き
    spySuperCanActivate = vi.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');
  });

  describe('canActivate', () => {
    it('Public の場合は true を返す（JWT 成功時）', async () => {
      vi.spyOn(reflector, 'get').mockReturnValue(true); // IS_PUBLIC_KEY

      const ctx = createContext();

      // JWT 認証成功の場合
      spySuperCanActivate.mockReturnValue(true); // ここは呼ばれない想定
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('Public の場合は true を返す（JWT 失敗時）', async () => {
      vi.spyOn(reflector, 'get').mockReturnValue(true); // IS_PUBLIC_KEY

      const ctx = createContext();

      // JWT 認証失敗の場合
      spySuperCanActivate.mockReturnValue(false); // ここは呼ばれない想定
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('JWT 認証失敗の場合は false を返す', async () => {
      vi.spyOn(reflector, 'get').mockReturnValue(false); // IS_PUBLIC_KEY

      const ctx = createContext();

      spySuperCanActivate.mockReturnValue(false); // JWT 認証失敗
      const result = await guard.canActivate(ctx);
      expect(result).toBe(false);
    });

    it('JWT 認証成功 & Raw Payload なしの場合 user を差し替える', async () => {
      const user = createUser();
      const userPayload = createUserPayload({ sub: 'sub-1' });
      const requestInit = { user: userPayload };
      const ctx = createContext(requestInit);

      spySuperCanActivate.mockReturnValue(true); // JWT 認証成功
      vi.spyOn(reflector, 'get')
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(false); // USE_RAW_JWT_PAYLOAD

      vi.spyOn(usersService, 'getUserBySub').mockResolvedValue(user);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(vi.spyOn(usersService, 'getUserBySub')).toHaveBeenCalledWith(userPayload.sub);
      expect(requestInit.user).toBe(user); // user が差し替えられている (UserPayload -> User)
    });

    it('JWT 認証成功 & Raw Payload の場合 user を差し替えない', async () => {
      const user = createUser();
      const userPayload = createUserPayload({ sub: 'sub-1' });
      const requestInit = { user: userPayload };
      const ctx = createContext(requestInit);

      spySuperCanActivate.mockReturnValue(true); // JWT 認証成功
      vi.spyOn(reflector, 'get')
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(true); // USE_RAW_JWT_PAYLOAD

      vi.spyOn(usersService, 'getUserBySub').mockResolvedValue(user);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(vi.spyOn(usersService, 'getUserBySub')).not.toHaveBeenCalled();
      expect(requestInit.user).toBe(userPayload); // user が差し替えられていない
    });

    it('super.canActivate が Observable の場合も通る', async () => {
      spySuperCanActivate.mockReturnValue(of(true)); // JWT 認証成功

      vi.spyOn(reflector, 'get')
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(true); // USE_RAW_JWT_PAYLOAD

      const ctx = createContext({ user: createUserPayload() });
      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });
  });
});
