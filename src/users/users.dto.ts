import { planEnumSchema, type PlanEnum } from '@/plans-config/plans-config.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class CreateUserRequest {
  @ApiProperty({ description: 'ユーザー名' })
  @IsString()
  readonly name: string;

  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  readonly plan: PlanEnum;
}

export class CreateUserResponse extends CreateUserRequest {
  @ApiProperty({ description: 'ユーザーID' })
  @IsString()
  readonly id: string;
}

export class GetPlanResponse {
  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  readonly plan: PlanEnum;
}
