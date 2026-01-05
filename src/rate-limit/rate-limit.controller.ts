import { Controller, Get } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/auth/permission.decorator';

@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get('/test')
  @Permission('test:rate_limit')
  @ApiResponse({ type: String })
  testRateLimit(): string {
    return this.rateLimitService.testRateLimit();
  }
}
