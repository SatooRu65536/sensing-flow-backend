import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsString, ValidateNested } from 'class-validator';

export class SensorData {
  @ApiProperty({ description: 'センサデータID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  dataName: string;

  @ApiProperty({ description: '作成日時' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  @IsDate()
  updatedAt: Date;
}

export class ListSensorDataResponse {
  @ApiProperty({ description: 'センサデータ一覧', type: SensorData, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensorData)
  sensorData: SensorData[];
}
