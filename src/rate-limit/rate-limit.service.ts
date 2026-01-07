import { RateLimitLogSchema } from '@/_schema';
import type { DbType } from '@/database/database.module';
import { RateLimit } from '@/plans-config/plans-config.schema';
import { User } from '@/users/users.dto';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { and, count, eq, gte } from 'drizzle-orm';

@Injectable()
export class RateLimitService {
  constructor(@Inject('DRIZZLE_DB') private db: DbType) {}

  testRateLimit(): string {
    return 'Rate limit service is working';
  }

  async checkRateLimit(user: User, permission: string, rateLimit: RateLimit): Promise<boolean> {
    if (rateLimit == undefined) return true;

    const limitTime = new Date(Date.now() - rateLimit.limitSec * 1000);

    const logCountRecors = await this.db
      .select({
        count: count(),
      })
      .from(RateLimitLogSchema)
      .where(
        and(
          eq(RateLimitLogSchema.userId, user.id),
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

  async logRateLimit(user: User, permission: string): Promise<void> {
    try {
      await this.db.insert(RateLimitLogSchema).values({
        userId: user.id,
        permission,
        timestamp: new Date(),
      });
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to log rate limit');
    }
  }
}
