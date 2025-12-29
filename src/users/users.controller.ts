import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetPlanResponse } from './users.dto';
import { ApiResponse } from '@nestjs/swagger';
import type { UserPayload } from '@/auth/jwt.schema';
import { Authed } from '@/auth/auth.decorator';
import { AuthorizationApi } from '@/auth/permission.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/plan')
  @ApiResponse({ type: GetPlanResponse })
  @AuthorizationApi()
  async getPlan(@Authed() user: UserPayload): Promise<GetPlanResponse> {
    return this.usersService.getPlan(user);
  }
}
