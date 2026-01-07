import { Test, TestingModule } from '@nestjs/testing';
import { createDbServiceMock, DbMock } from '@/utils/test/service-mocks';
import { RateLimitService } from './rate-limit.service';
import { createUser } from '@/utils/test/test-factories';
import { InternalServerErrorException } from '@nestjs/common';

describe('RateLimitService', () => {
  let rateLimitService: RateLimitService;
  let dbMock: DbMock;

  beforeEach(async () => {
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
  });

  describe('testRateLimit', () => {
    it('文字列を返す', () => {
      const result = rateLimitService.testRateLimit();
      expect(result).toBeTypeOf('string');
    });
  });

  describe('checkRateLimit', () => {
    it('レート制限内の場合は true を返す', async () => {
      const user = createUser();

      vi.spyOn(dbMock, 'where').mockResolvedValue([{ count: 0 }]);

      const result = await rateLimitService.checkRateLimit(user, 'unit_test:rate_limit', { count: 1, limitSec: 60 });
      expect(result).toBe(true);
    });

    it('レート制限を超過している場合は false を返す', async () => {
      const user = createUser();

      vi.spyOn(dbMock, 'where').mockResolvedValue([{ count: 2 }]);

      const result = await rateLimitService.checkRateLimit(user, 'unit_test:rate_limit', { count: 1, limitSec: 60 });
      expect(result).toBe(false);
    });

    it('レート制限がない場合は true を返す', async () => {
      const user = createUser();

      vi.spyOn(dbMock, 'where').mockResolvedValue([{ count: 0 }]);

      const result = await rateLimitService.checkRateLimit(user, 'unit_test:rate_limit', undefined);
      expect(result).toBe(true);
    });

    it('ログカウントの取得に失敗した場合は例外をスローする', async () => {
      const user = createUser();

      vi.spyOn(dbMock, 'where').mockResolvedValue([]);

      await expect(
        rateLimitService.checkRateLimit(user, 'unit_test:rate_limit', { count: 1, limitSec: 60 }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('logRateLimit', () => {
    it('レート制限ログを正常に記録できる', async () => {
      const user = createUser();
      const permission = 'unit_test:rate_limit';

      await expect(rateLimitService.logRateLimit(user, permission)).resolves.toBeUndefined();
      expect(dbMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          permission,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          timestamp: expect.any(Date),
        }),
      );
    });

    it('エラー発生時に例外をスローする', async () => {
      const user = createUser();
      const permission = 'unit_test:rate_limit';

      vi.spyOn(dbMock, 'insert').mockRejectedValue(new Error('DB error'));

      await expect(rateLimitService.logRateLimit(user, permission)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
