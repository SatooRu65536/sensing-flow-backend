import { Body, Controller, Post } from '@nestjs/common';
import { SensorUploadService } from './sensor-upload.service';
import { Authed } from '@/auth/auth.decorator';
import type { UserPayload } from '@/auth/jwt.schema';
import { StartUploadSensorDataRequest, StartUploadSensorDataResponse } from './sensor-upload.dto';
import { ApiBody, ApiResponse } from '@nestjs/swagger';

@Controller('sensor-upload')
export class SensorUploadController {
  constructor(private readonly sensorUploadService: SensorUploadService) {}

  @Post()
  @ApiBody({ type: StartUploadSensorDataRequest })
  @ApiResponse({ type: StartUploadSensorDataResponse })
  async startUploadSensorData(
    @Authed() user: UserPayload,
    @Body() body: StartUploadSensorDataRequest,
  ): Promise<StartUploadSensorDataResponse> {
    return this.sensorUploadService.startUploadSensorData(user, body);
  }
}
