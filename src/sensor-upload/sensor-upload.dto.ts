import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString } from 'class-validator';

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

export class AbortUploadSensorDataResponse {
  @ApiProperty({ description: 'センサデータのアップロードID' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'センサデータ名' })
  @IsString()
  dataName: string;

  @ApiProperty({ description: '作成日時' })
  @IsDate()
  createdAt: Date;
}
