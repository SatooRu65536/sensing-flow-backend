import { Controller, Get } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { Permission } from '@/common/decorators/permission.decorator';

@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Get('/test')
  @Permission('test:rate_limit')
  @ApiOkResponse({ type: String })
  testRateLimit(): string {
    return this.rateLimitService.testRateLimit();
  }
}
