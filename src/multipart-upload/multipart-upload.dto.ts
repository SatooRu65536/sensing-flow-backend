import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { SensorUploadStatusEnum, sensorUploadStatusEnumSchema } from './multipart-upload.model';
import { Type } from 'class-transformer';

export class MultiPartUpload {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  @IsNotEmpty()
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;

  @ApiProperty({ description: 'ステータス', enum: sensorUploadStatusEnumSchema.options })
  @IsEnum(sensorUploadStatusEnumSchema.options)
  @IsNotEmpty()
  readonly status: SensorUploadStatusEnum;

  @ApiProperty({ description: '作成日時' })
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

export class ListMultipartUploadResponse {
  @ApiProperty({ description: 'センサデータアップロード一覧', type: MultiPartUpload, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiPartUpload)
  @IsNotEmpty()
  readonly sensorUploads: MultiPartUpload[];
}

export class StartMultipartUploadRequest {
  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class StartMultipartUploadResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  @IsNotEmpty()
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class PostMultipartUploadResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  @IsNotEmpty()
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class AbortMultipartUploadResponse extends MultiPartUpload {}
