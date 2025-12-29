import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { SensorUploadService } from './sensor-upload.service';
import { Authed } from '@/auth/auth.decorator';
import type { UserPayload } from '@/auth/jwt.schema';
import {
  AbortUploadSensorDataResponse,
  GetUploadSensorDataResponse,
  PostUploadSensorDataResponse,
  StartUploadSensorDataRequest,
  StartUploadSensorDataResponse,
} from './sensor-upload.dto';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/auth/permission.decorator';

@Controller('sensor-upload')
export class SensorUploadController {
  constructor(private readonly sensorUploadService: SensorUploadService) {}

  @Get()
  @ApiResponse({ type: GetUploadSensorDataResponse })
  @Permission('list:sensor_uploads')
  async listSensorUploads(@Authed() user: UserPayload): Promise<GetUploadSensorDataResponse> {
    return this.sensorUploadService.listSensorUploads(user);
  }

  @Post()
  @ApiBody({ type: StartUploadSensorDataRequest })
  @ApiResponse({ type: StartUploadSensorDataResponse })
  @Permission('post:sensor_uploads')
  async startSensorUpload(
    @Authed() user: UserPayload,
    @Body() body: StartUploadSensorDataRequest,
  ): Promise<StartUploadSensorDataResponse> {
    return this.sensorUploadService.startSensorUpload(user, body);
  }

  @Put(':uploadId')
  @ApiBody({ description: 'CSVデータ', type: String })
  @ApiResponse({ type: PostUploadSensorDataResponse })
  @Permission('post:sensor_uploads')
  async postUploadSensorData(
    @Body() body: string,
    @Authed() user: UserPayload,
    @Param('uploadId') uploadId: string,
  ): Promise<PostUploadSensorDataResponse> {
    return this.sensorUploadService.postUploadSensorData(user, uploadId, body);
  }

  @Patch(':uploadId')
  @ApiResponse({ type: PostUploadSensorDataResponse })
  @Permission('post:sensor_uploads')
  async completeSensorUpload(
    @Authed() user: UserPayload,
    @Param('uploadId') uploadId: string,
  ): Promise<PostUploadSensorDataResponse> {
    return this.sensorUploadService.completeSensorUpload(user, uploadId);
  }

  @Delete(':uploadId')
  @ApiResponse({ type: AbortUploadSensorDataResponse })
  @Permission('abort:sensor_uploads')
  async abortSensorUpload(
    @Authed() user: UserPayload,
    @Param('uploadId') uploadId: string,
  ): Promise<AbortUploadSensorDataResponse> {
    return this.sensorUploadService.abortSensorUpload(user, uploadId);
  }
}
