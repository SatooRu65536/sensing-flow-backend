import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './permission.decorator';
import plansMap from '../plans.json';
import { UserPayload } from './jwt.schema';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request & { user: UserPayload }>();
    const user = request.user;
    if (!user || !user.plan) return false;

    // JSON から権限を取得
    const permissions: string[] = plansMap.plans[user.plan] || [];

    // "*" は全権限
    return permissions.includes(requiredPermission) || permissions.includes('*');
  }
}
