import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { SensorUploadService } from './multipart-upload.service';
import { Authed } from '@/auth/auth.decorator';
import {
  AbortMultipartUploadResponse,
  ListMultipartUploadResponse,
  PostMultipartUploadResponse,
  StartMultipartUploadRequest,
  StartMultipartUploadResponse,
} from './multipart-upload.dto';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/auth/permission.decorator';
import { User } from '@/users/users.dto';

@Controller('sensor-upload')
export class MultipartUploadController {
  constructor(private readonly sensorUploadService: SensorUploadService) {}

  @Get()
  @ApiResponse({ type: ListMultipartUploadResponse })
  @Permission('list:multipart_upload')
  async listSensorUploads(@Authed() user: User): Promise<ListMultipartUploadResponse> {
    return this.sensorUploadService.listSensorUploads(user);
  }

  @Post()
  @ApiBody({ type: StartMultipartUploadRequest })
  @ApiResponse({ type: StartMultipartUploadResponse })
  @Permission('post:multipart_upload')
  async startSensorUpload(
    @Authed() user: User,
    @Body() body: StartMultipartUploadRequest,
  ): Promise<StartMultipartUploadResponse> {
    return this.sensorUploadService.startSensorUpload(user, body);
  }

  @Put(':uploadId')
  @ApiConsumes('text/csv')
  @ApiBody({ description: 'CSVデータ', type: String })
  @ApiResponse({ type: PostMultipartUploadResponse })
  @Permission('post:multipart_upload')
  async postMultipartUpload(
    @Body() body: string,
    @Authed() user: User,
    @Param('uploadId') uploadId: string,
  ): Promise<PostMultipartUploadResponse> {
    return this.sensorUploadService.postMultipartUpload(user, uploadId, body);
  }

  @Patch(':uploadId')
  @ApiResponse({ type: PostMultipartUploadResponse })
  @Permission('post:multipart_upload')
  async completeSensorUpload(
    @Authed() user: User,
    @Param('uploadId') uploadId: string,
  ): Promise<PostMultipartUploadResponse> {
    return this.sensorUploadService.completeSensorUpload(user, uploadId);
  }

  @Delete(':uploadId')
  @ApiResponse({ type: AbortMultipartUploadResponse })
  @Permission('abort:multipart_upload')
  async abortSensorUpload(
    @Authed() user: User,
    @Param('uploadId') uploadId: string,
  ): Promise<AbortMultipartUploadResponse> {
    return this.sensorUploadService.abortSensorUpload(user, uploadId);
  }
}
