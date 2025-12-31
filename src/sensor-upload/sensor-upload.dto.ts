import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsString, ValidateNested } from 'class-validator';
import { SensorUploadStatusEnum, sensorUploadStatusEnumSchema } from './sensor-upload.model';
import { Type } from 'class-transformer';

export class SensorUpload {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  dataName: string;

  @ApiProperty({ description: 'ステータス', enum: sensorUploadStatusEnumSchema.options })
  @IsEnum(sensorUploadStatusEnumSchema.options)
  status: SensorUploadStatusEnum;

  @ApiProperty({ description: '作成日時' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  @IsDate()
  updatedAt: Date;
}

export class ListUploadSensorDataResponse {
  @ApiProperty({ description: 'センサデータアップロード一覧', type: SensorUpload, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensorUpload)
  sensorUploads: SensorUpload[];
}

export class StartUploadSensorDataRequest {
  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  dataName: string;
}

export class StartUploadSensorDataResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  dataName: string;
}

export class PostUploadSensorDataResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  dataName: string;
}

export class AbortUploadSensorDataResponse extends SensorUpload {}
