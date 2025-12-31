import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { SensorUploadService } from './sensor-upload.service';
import { Authed } from '@/auth/auth.decorator';
import type { UserPayload } from '@/auth/jwt.schema';
import {
  AbortUploadSensorDataResponse,
  ListUploadSensorDataResponse,
  PostUploadSensorDataResponse,
  StartUploadSensorDataRequest,
  StartUploadSensorDataResponse,
} from './sensor-upload.dto';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/auth/permission.decorator';

@Controller('sensor-upload')
export class SensorUploadController {
  constructor(private readonly sensorUploadService: SensorUploadService) {}

  @Get()
  @ApiResponse({ type: ListUploadSensorDataResponse })
  @Permission('list:sensor_upload')
  async listSensorUploads(@Authed() user: UserPayload): Promise<ListUploadSensorDataResponse> {
    return this.sensorUploadService.listSensorUploads(user);
  }

  @Post()
  @ApiBody({ type: StartUploadSensorDataRequest })
  @ApiResponse({ type: StartUploadSensorDataResponse })
  @Permission('post:sensor_upload')
  async startSensorUpload(
    @Authed() user: UserPayload,
    @Body() body: StartUploadSensorDataRequest,
  ): Promise<StartUploadSensorDataResponse> {
    return this.sensorUploadService.startSensorUpload(user, body);
  }

  @Put(':uploadId')
  @ApiConsumes('text/csv')
  @ApiBody({ description: 'CSVデータ', type: String })
  @ApiResponse({ type: PostUploadSensorDataResponse })
  @Permission('post:sensor_upload')
  async postUploadSensorData(
    @Body() body: string,
    @Authed() user: UserPayload,
    @Param('uploadId') uploadId: string,
  ): Promise<PostUploadSensorDataResponse> {
    return this.sensorUploadService.postUploadSensorData(user, uploadId, body);
  }

  @Patch(':uploadId')
  @ApiResponse({ type: PostUploadSensorDataResponse })
  @Permission('post:sensor_upload')
  async completeSensorUpload(
    @Authed() user: UserPayload,
    @Param('uploadId') uploadId: string,
  ): Promise<PostUploadSensorDataResponse> {
    return this.sensorUploadService.completeSensorUpload(user, uploadId);
  }

  @Delete(':uploadId')
  @ApiResponse({ type: AbortUploadSensorDataResponse })
  @Permission('abort:sensor_upload')
  async abortSensorUpload(
    @Authed() user: UserPayload,
    @Param('uploadId') uploadId: string,
  ): Promise<AbortUploadSensorDataResponse> {
    return this.sensorUploadService.abortSensorUpload(user, uploadId);
  }
}
