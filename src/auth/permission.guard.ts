import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './permission.decorator';
import plansMap from '../plans.json';
import { UserPayload } from './jwt.schema';
import { UsersService } from '@/users/users.service';
import { rateLimitStringSchema } from '@/plans-config/plans-config.schema';
import { RateLimitService } from '@/rate-limit/rate-limit.service';
import { TooManyRequestsException } from '@/common/exceptions/too-many-request.exception';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request & { user: UserPayload }>();
    const user = request.user;
    if (!user) return false;

    const planResponse = await this.usersService.getPlan(user);

    // JSON から権限を取得
    const permissions: Record<string, string> | undefined = plansMap.plans[planResponse.plan]?.permissions;

    if (permissions == undefined) return false;

    // "*" は全権限
    if (Object.keys(permissions).includes('*')) return true;

    const rateLimitStr: string | undefined = permissions[requiredPermission];
    const rateLimit = rateLimitStringSchema.parse(rateLimitStr);

    const isWithinLimit = await this.rateLimitService.checkRateLimit(user, requiredPermission, rateLimit);
    if (!isWithinLimit) throw new TooManyRequestsException();

    await this.rateLimitService.logRateLimit(user, requiredPermission);

    return isWithinLimit;
  }
}
