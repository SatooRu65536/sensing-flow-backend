import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { MultipartUploadStatusEnum, multipartUploadStatusEnumSchema } from './multipart-upload.model';
import { Type } from 'class-transformer';

export class MultiPartUpload {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;

  @ApiProperty({ description: 'ステータス', enum: multipartUploadStatusEnumSchema.options })
  @IsEnum(multipartUploadStatusEnumSchema.options)
  readonly status: MultipartUploadStatusEnum;

  @ApiProperty({ description: '作成日時' })
  @IsDate()
  @Type(() => Date)
  readonly createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  @IsDate()
  @Type(() => Date)
  readonly updatedAt: Date;
}

export class ListMultipartUploadResponse {
  @ApiProperty({ description: 'センサデータアップロード一覧', type: MultiPartUpload, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiPartUpload)
  readonly multipartUploads: MultiPartUpload[];
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
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class PostMultipartUploadResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class CompleteMultipartUploadResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class AbortMultipartUploadResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  readonly uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}
