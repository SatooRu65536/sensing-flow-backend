import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/auth.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getRoot(): string {
    return this.appService.getHello();
  }

  @Get('/hello')
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }
}
