import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { SensorDataService } from './sensor-data.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { Authed } from '@/common/decorators/auth.decorator';
import { User } from '@/users/users.dto';
import { Permission } from '@/common/decorators/permission.decorator';
import { UploadSensorDataRequest, UploadSensorDataResponse } from './sensor-data.dto';

@Controller('sensor-data')
export class SensorDataController {
  constructor(private readonly sensorDataService: SensorDataService) {}

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
}
