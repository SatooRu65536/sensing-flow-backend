import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './permission.decorator';
import plansMap from '../plans.json';
import { UserPayload } from './jwt.schema';
import { UsersService } from '@/users/users.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request & { user: UserPayload }>();
    const user = request.user;
    if (!user) return false;

    const planResponse = this.usersService.getPlan(user);

    // 権限を取得
    const permissions: string[] = plansMap.plans[planResponse.plan] || [];

    // "*" は全権限
    return permissions.includes(requiredPermission) || permissions.includes('*');
  }
}
