import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class TestRateLimitResponse {
  @ApiProperty({ description: '残り使用可能な回数' })
  @IsNumber()
  @IsNotEmpty()
  readonly remainingCalls: number;
}
