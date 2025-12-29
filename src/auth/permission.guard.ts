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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string | string[]>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request & { user: UserPayload }>();
    const user = request.user;
    if (!user) return false;

    const planResponse = await this.usersService.getPlan(user);

    // JSON から権限を取得
    const permissions: string[] = plansMap.plans[planResponse.plan].permissions || [];

    // "*" は全権限
    if (permissions.includes('*')) return true;

    const requiredPermissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

    // OR 条件: どれか1つでもユーザー権限に含まれていれば true
    return requiredPermissions.some((p) => permissions.includes(p));
  }
}
