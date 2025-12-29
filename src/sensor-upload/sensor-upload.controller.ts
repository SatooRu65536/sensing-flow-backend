import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { SensorUploadService } from './sensor-upload.service';
import { Authed } from '@/auth/auth.decorator';
import type { UserPayload } from '@/auth/jwt.schema';
import {
  AbortUploadSensorDataResponse,
  StartUploadSensorDataRequest,
  StartUploadSensorDataResponse,
} from './sensor-upload.dto';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/auth/permission.decorator';

@Controller('sensor-upload')
export class SensorUploadController {
  constructor(private readonly sensorUploadService: SensorUploadService) {}

  @Post()
  @ApiBody({ type: StartUploadSensorDataRequest })
  @ApiResponse({ type: StartUploadSensorDataResponse })
  @Permission('upload:sensor_data')
  async startUploadSensorData(
    @Authed() user: UserPayload,
    @Body() body: StartUploadSensorDataRequest,
  ): Promise<StartUploadSensorDataResponse> {
    return this.sensorUploadService.startUploadSensorData(user, body);
  }

  @Delete(':uploadId')
  @ApiResponse({ type: AbortUploadSensorDataResponse })
  @Permission('abort:sensor_data')
  async abortUploadSensorData(
    @Authed() user: UserPayload,
    @Param('uploadId') uploadId: string,
  ): Promise<AbortUploadSensorDataResponse> {
    return this.sensorUploadService.abortUploadSensorData(user, uploadId);
  }
}
