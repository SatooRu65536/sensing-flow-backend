import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserRequest, CreateUserResponse, GetPlanResponse, GetUserResponse, User } from './users.dto';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Authed } from '@/common/decorators/auth.decorator';
import { AuthorizationApi } from '@/common/decorators/permission.decorator';
import { BeforeRegister } from '@/common/decorators/before-register.decorator';
import type { UserPayload } from '@/auth/jwt.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiBody({ type: CreateUserRequest })
  @ApiOkResponse({ type: CreateUserResponse })
  @BeforeRegister()
  async createUser(@Authed() userPayload: UserPayload, @Body() body: CreateUserRequest): Promise<CreateUserResponse> {
    return this.usersService.createUser(userPayload, body);
  }

  @Get('/me')
  @ApiOkResponse({ type: GetUserResponse })
  @AuthorizationApi()
  getMe(@Authed() user: User): GetUserResponse {
    return this.usersService.getMe(user);
  }

  @Get('/plan')
  @ApiOkResponse({ type: GetPlanResponse })
  @AuthorizationApi()
  getPlan(@Authed() user: User): GetPlanResponse {
    return this.usersService.getPlan(user);
  }
}
