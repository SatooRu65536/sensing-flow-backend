import { RateLimitLogSchema } from '@/_schema';
import { UserPayload } from '@/auth/jwt.schema';
import type { DbType } from '@/database/database.module';
import { RateLimit } from '@/plans-config/plans-config.schema';
import { UsersService } from '@/users/users.service';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { and, count, eq, gte } from 'drizzle-orm';

@Injectable()
export class RateLimitService {
  constructor(
    @Inject('DRIZZLE_DB') private db: DbType,
    private usersService: UsersService,
  ) {}

  testRateLimit(): string {
    return 'Rate limit service is working';
  }

  async checkRateLimit(user: UserPayload, permission: string, rateLimit: RateLimit): Promise<boolean> {
    if (rateLimit == undefined) return true;

    const userRecord = await this.usersService.getUserBySub(user.sub);

    const limitTime = new Date(Date.now() - rateLimit.limitSec * 1000);

    const logCountRecors = await this.db
      .select({
        count: count(),
      })
      .from(RateLimitLogSchema)
      .where(
        and(
          eq(RateLimitLogSchema.userId, userRecord.id),
          eq(RateLimitLogSchema.permission, permission),
          gte(RateLimitLogSchema.timestamp, limitTime),
        ),
      );
    if (logCountRecors.length === 0) {
      throw new InternalServerErrorException('Failed to check rate limit');
    }

    const logCountRecord = logCountRecors[0];

    return logCountRecord.count < rateLimit.count;
  }

  async logRateLimit(user: UserPayload, permission: string): Promise<void> {
    const userRecord = await this.usersService.getUserBySub(user.sub);

    await this.db.insert(RateLimitLogSchema).values({
      userId: userRecord.id,
      permission,
      timestamp: new Date(),
    });
  }
}
