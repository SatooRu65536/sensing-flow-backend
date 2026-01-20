import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { SensorDataService } from './sensor-data.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { Authed } from '@/common/decorators/auth.decorator';
import { User } from '@/users/users.dto';
import { Permission } from '@/common/decorators/permission.decorator';
import {
  GetSensorDataResponse,
  ListSensorDataResponse,
  UpdateSensorDataRequest,
  UpdateSensorDataResponse,
  UploadSensorDataRequest,
  UploadSensorDataResponse,
} from './sensor-data.dto';
import type { SensorDataId } from '@/types/brand';

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
  @HttpCode(HttpStatus.MULTI_STATUS)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @Permission('upload:sensor_data')
  async uploadSensorDataFiles(
    @Authed() user: User,
    @Body() body: UploadSensorDataRequest,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<UploadSensorDataResponse> {
    return this.sensorDataService.uploadSensorDataFiles(user, body, files);
  }

  @Get(':id')
  @ApiOkResponse({ type: GetSensorDataResponse })
  @Permission('read:sensor_data')
  async getSensorData(@Authed() user: User, @Param('id') id: SensorDataId): Promise<GetSensorDataResponse> {
    return this.sensorDataService.getSensorData(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UpdateSensorDataResponse })
  @Permission('update:sensor_data')
  async updateSensorData(
    @Authed() user: User,
    @Param('id') id: SensorDataId,
    @Body() body: UpdateSensorDataRequest,
  ): Promise<UpdateSensorDataResponse> {
    return this.sensorDataService.updateSensorData(user, id, body);
  }
}
