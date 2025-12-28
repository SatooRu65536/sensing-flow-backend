import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Permission } from './auth/permission.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/hello')
  @Permission('read:health')
  getHello(): string {
    return this.appService.getHello();
  }
}
