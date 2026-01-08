import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class SensorData {
  @ApiProperty({ description: 'センサデータID' })
  @IsString()
  @IsNotEmpty()
  readonly id: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  @IsNotEmpty()
  readonly dataName: string;

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

export class ListSensorDataResponse {
  @ApiProperty({ description: 'センサデータ一覧', type: SensorData, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensorData)
  @IsNotEmpty()
  readonly sensorData: SensorData[];
}

export class GetSensorDataPresignedUrlResponse extends SensorData {
  @ApiProperty({ description: 'presigned URL' })
  @IsString()
  @IsNotEmpty()
  readonly presignedUrl: string;
}
