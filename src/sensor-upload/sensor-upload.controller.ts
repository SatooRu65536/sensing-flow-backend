import { Body, Controller, Post } from '@nestjs/common';
import { SensorUploadService } from './sensor-upload.service';
import { Authed } from '@/auth/auth.decorator';
import type { UserPayload } from '@/auth/jwt.schema';
import { StartUploadSensorDataRequest, StartUploadSensorDataResponse } from './sensor-upload.dto';
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
}
