import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class SensorData {
  @ApiProperty({ description: 'センサデータID' })
  @IsString()
  readonly id: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;

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

export class UploadSensorDataRequest {
  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class UploadSensorDataResponse extends SensorData {}

export class GetSensorDataResponse extends SensorData {}

export class UpdateSensorDataRequest {
  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;
}

export class UpdateSensorDataResponse extends SensorData {}

export class GetSensorDataPresignedUrlResponse extends SensorData {
  @ApiProperty({ description: 'presigned URL' })
  @IsString()
  readonly presignedUrl: string;
}
