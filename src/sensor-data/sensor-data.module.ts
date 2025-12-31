import { Module } from '@nestjs/common';
import { SensorDataController } from './sensor-data.controller';
import { SensorDataService } from './sensor-data.service';
import { S3Module } from '@/s3/s3.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [S3Module, UsersModule],
  controllers: [SensorDataController],
  providers: [SensorDataService],
})
export class SensorDataModule {}
