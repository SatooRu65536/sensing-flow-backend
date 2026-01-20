import { S3Module } from '@/s3/s3.module';
import { Module } from '@nestjs/common';
import { SensorDataController } from './sensor-data.controller';
import { SensorDataService } from './sensor-data.service';

@Module({
  imports: [S3Module],
  controllers: [SensorDataController],
  providers: [SensorDataService],
})
export class SensorDataModule {}
