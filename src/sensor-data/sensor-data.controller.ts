import { Authed } from '@/common/decorators/auth.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  GetSensorDataPresignedUrlResponse,
  GetSensorDataResponse,
  ListSensorDataResponse,
  UpdateSensorDataRequest,
  UpdateSensorDataResponse,
  UploadSensorDataRequest,
  UploadSensorDataResponse,
} from './sensor-data.dto';
import { SensorDataService } from './sensor-data.service';
import { ApiConsumes, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { Permission } from '@/common/decorators/permission.decorator';
import { User } from '@/users/users.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('sensor-data')
export class SensorDataController {
  constructor(private readonly sensorDataService: SensorDataService) {}

  @Get()
  @ApiOkResponse({ type: ListSensorDataResponse })
  @ApiParam({ name: 'page', required: false, description: 'ページ番号' })
  @ApiParam({ name: 'perPage', required: false, description: '1ページあたりの件数' })
  @Permission('list:sensor_data')
  async listSensorData(
    @Authed() user: User,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ): Promise<ListSensorDataResponse> {
    return this.sensorDataService.listSensorData(user, page, perPage);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @Permission('upload:sensor_data')
  async uploadSensorDataFiles(
    @Authed() user: User,
    @Body() body: UploadSensorDataRequest,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<UploadSensorDataResponse[]> {
    return this.sensorDataService.uploadSensorDataFiles(user, body, files);
  }

  @Get(':id')
  @ApiOkResponse({ type: GetSensorDataResponse })
  @Permission('read:sensor_data')
  async getSensorData(@Authed() user: User, @Param('id') id: string): Promise<GetSensorDataResponse> {
    return this.sensorDataService.getSensorData(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UpdateSensorDataResponse })
  @Permission('update:sensor_data')
  async updateSensorData(
    @Authed() user: User,
    @Param('id') id: string,
    @Body() body: UpdateSensorDataRequest,
  ): Promise<UpdateSensorDataResponse> {
    return this.sensorDataService.updateSensorData(user, id, body);
  }

  @Delete(':id')
  @Permission('delete:sensor_data')
  async deleteSensorData(@Authed() user: User, @Param('id') id: string): Promise<void> {
    return this.sensorDataService.deleteSensorData(user, id);
  }

  @Get(':id/presigned-url')
  @ApiOkResponse({ type: GetSensorDataPresignedUrlResponse })
  @Permission('read:sensor_data')
  async getSensorDataPresignedUrl(
    @Authed() user: User,
    @Param('id') id: string,
  ): Promise<GetSensorDataPresignedUrlResponse> {
    return this.sensorDataService.getSensorDataPresignedUrl(user, id);
  }
}
