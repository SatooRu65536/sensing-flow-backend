import { planEnumSchema, type PlanEnum } from '@/plans-config/plans-config.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetPlanResponse {
  @ApiProperty({ enum: planEnumSchema.options, description: 'The plan of the user' })
  @IsString()
  readonly plan: PlanEnum;
}
