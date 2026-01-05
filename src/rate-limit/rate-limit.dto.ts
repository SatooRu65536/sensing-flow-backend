import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class TestRateLimitResponse {
  @ApiProperty({ description: '残り使用可能な回数' })
  @IsNumber()
  remainingCalls: number;
}
