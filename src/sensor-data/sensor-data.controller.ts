import { Authed } from '@/auth/auth.decorator';
import type { UserPayload } from '@/auth/jwt.schema';
import { Controller, Get, Query } from '@nestjs/common';
import { ListSensorDataResponse } from './sensor-data.dto';
import { SensorDataService } from './sensor-data.service';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/auth/permission.decorator';

@Controller('sensor-data')
export class SensorDataController {
  constructor(private readonly sensorDataService: SensorDataService) {}

  @Get()
  @ApiResponse({ type: ListSensorDataResponse })
  @ApiParam({ name: 'page', required: false, description: 'ページ番号' })
  @ApiParam({ name: 'perPage', required: false, description: '1ページあたりの件数' })
  @Permission('list:sensor_data')
  async listSensorData(
    @Authed() user: UserPayload,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
  ): Promise<ListSensorDataResponse> {
    return this.sensorDataService.listSensorData(user, page, perPage);
  }
}
