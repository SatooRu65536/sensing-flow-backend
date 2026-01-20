import type { SensorDataId, SensorDataName } from '@/types/brand';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SensorsEnum, sensorsEnumSchema } from './sensor-data.schema';
import { OmitType } from '@nestjs/swagger';

export class SensorData {
  @ApiProperty({ description: 'センサデータID' })
  @IsString()
  readonly id: SensorDataId;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: SensorDataName;

  @ApiProperty({ description: '有効なセンサ', enum: sensorsEnumSchema.options })
  @IsEnum(sensorsEnumSchema.options)
  readonly activeSensors: SensorsEnum[];

  @ApiProperty({ description: '作成日時' })
  @IsDate()
  @Type(() => Date)
  readonly createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  @IsDate()
  @Type(() => Date)
  readonly updatedAt: Date;
}

export class ListSensorDataResponse {
  @ApiProperty({ description: 'センサデータ一覧', type: SensorData, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensorData)
  readonly sensorData: SensorData[];
}

// createdAt はアプリ側での作成日時とするため必要
export class UploadSensorDataRequest extends OmitType(SensorData, ['id', 'updatedAt']) {
  @ApiProperty({ description: 'センサデータID' })
  @IsString()
  @IsOptional()
  readonly id?: SensorDataId;
}

export class UploadSensorDataResponse extends OmitType(SensorData, ['activeSensors']) {
  @ApiProperty({ description: 'アップロード成功したセンサ', enum: sensorsEnumSchema.options })
  @IsEnum(sensorsEnumSchema.options)
  readonly uploadedSensors: SensorsEnum[];

  @ApiProperty({ description: 'アップロード失敗したセンサ' })
  readonly failedSensors: string[];
}
