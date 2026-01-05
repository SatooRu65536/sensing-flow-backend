import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserRequest, CreateUserResponse, GetPlanResponse, GetUserResponse } from './users.dto';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import type { UserPayload } from '@/auth/jwt.schema';
import { Authed } from '@/auth/auth.decorator';
import { AuthorizationApi } from '@/auth/permission.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiBody({ type: CreateUserRequest })
  @ApiResponse({ type: CreateUserResponse })
  @AuthorizationApi()
  async createUser(@Authed() user: UserPayload, @Body() body: CreateUserRequest): Promise<CreateUserResponse> {
    return this.usersService.createUser(user, body);
  }

  @Get('/me')
  @ApiResponse({ type: GetUserResponse })
  @AuthorizationApi()
  async getMe(@Authed() user: UserPayload): Promise<GetUserResponse> {
    return this.usersService.getMe(user);
  }

  @Get('/plan')
  @ApiResponse({ type: GetPlanResponse })
  @AuthorizationApi()
  async getPlan(@Authed() user: UserPayload): Promise<GetPlanResponse> {
    return this.usersService.getPlan(user);
  }
}
