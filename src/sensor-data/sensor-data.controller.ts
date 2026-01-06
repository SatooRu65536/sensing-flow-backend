import { Authed } from '@/auth/auth.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetSensorDataPresignedUrlResponse, ListSensorDataResponse } from './sensor-data.dto';
import { SensorDataService } from './sensor-data.service';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/auth/permission.decorator';
import { User } from '@/users/users.dto';

@Controller('sensor-data')
export class SensorDataController {
  constructor(private readonly sensorDataService: SensorDataService) {}

  @Get()
  @ApiResponse({ type: ListSensorDataResponse })
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

  @Get(':id')
  @ApiResponse({ type: GetSensorDataPresignedUrlResponse })
  @Permission('read:sensor_data')
  async getSensorDataPresignedUrl(
    @Authed() user: User,
    @Param('id') id: string,
  ): Promise<GetSensorDataPresignedUrlResponse> {
    return this.sensorDataService.getSensorDataPresignedUrl(user, id);
  }
}
