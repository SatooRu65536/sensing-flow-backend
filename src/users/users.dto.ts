import { planEnumSchema, type PlanEnum } from '@/plans-config/plans-config.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsString } from 'class-validator';

export class CreateUserRequest {
  @ApiProperty({ description: 'ユーザー名' })
  @IsString()
  readonly name: string;

  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  readonly plan: PlanEnum;
}

class User {
  @ApiProperty({ description: 'ユーザーID' })
  @IsString()
  readonly id: string;

  @ApiProperty({ description: 'ユーザー名' })
  @IsString()
  readonly name: string;

  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  readonly plan: PlanEnum;
}

export class CreateUserResponse extends User {}

export class GetUserResponse extends User {
  @ApiProperty({ description: '登録日時' })
  @IsDate()
  readonly createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  @IsDate()
  readonly updatedAt: Date;
}

export class GetPlanResponse {
  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  readonly plan: PlanEnum;
}
