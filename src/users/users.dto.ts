import { planEnumSchema, type PlanEnum } from '@/plans-config/plans-config.schema';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserRequest {
  @ApiProperty({ description: 'ユーザー名' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  @IsNotEmpty()
  readonly plan: PlanEnum;
}

export class User {
  @ApiProperty({ description: 'ユーザーID' })
  @IsString()
  @IsNotEmpty()
  readonly id: string;

  @ApiProperty({ description: 'ユーザー名' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ description: 'ユーザー識別子' })
  @IsString()
  @IsNotEmpty()
  readonly sub: string;

  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  @IsNotEmpty()
  readonly plan: PlanEnum;

  @ApiProperty({ description: '登録日時' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  readonly createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  readonly updatedAt: Date;
}

export class CreateUserResponse {
  @ApiProperty({ description: 'ユーザーID' })
  @IsString()
  @IsNotEmpty()
  readonly id: string;

  @ApiProperty({ description: 'ユーザー名' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  @IsNotEmpty()
  readonly plan: PlanEnum;
}

export class GetUserResponse {
  @ApiProperty({ description: 'ユーザーID' })
  @IsString()
  @IsNotEmpty()
  readonly id: string;

  @ApiProperty({ description: 'ユーザー名' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  @IsNotEmpty()
  readonly plan: PlanEnum;

  @ApiProperty({ description: '登録日時' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  readonly createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  readonly updatedAt: Date;
}

export class GetPlanResponse {
  @ApiProperty({ enum: planEnumSchema.options, description: 'プラン' })
  @IsEnum(planEnumSchema.options)
  @IsNotEmpty()
  readonly plan: PlanEnum;
}
