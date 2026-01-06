import { Module } from '@nestjs/common';
import { RateLimitController } from './rate-limit.controller';
import { RateLimitService } from './rate-limit.service';

@Module({
  controllers: [RateLimitController],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
