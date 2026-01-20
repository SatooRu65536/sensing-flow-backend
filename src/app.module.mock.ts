import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { S3Module } from './s3/s3.module';
import { SensorDataModule } from './sensor-data/sensor-data.module';

@Module({
  imports: [AuthModule, S3Module, DatabaseModule, UsersModule, RateLimitModule, SensorDataModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModuleMock {}
