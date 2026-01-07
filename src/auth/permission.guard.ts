import { Injectable, CanActivate, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../common/decorators/permission.decorator';
import plansConfig from '../plans.json';
import { rateLimitStringSchema } from '@/plans-config/plans-config.schema';
import { RateLimitService } from '@/rate-limit/rate-limit.service';
import { TooManyRequestsException } from '@/common/exceptions/too-many-request.exception';
import { User } from '@/users/users.dto';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request & { user: User }>();
    const user = request.user;
    if (!user) return false;

    // JSON から権限を取得
    const permissions: Record<string, string> | undefined = plansConfig.plans[user.plan]?.permissions;

    if (permissions == undefined) return false;

    // "*" は全権限
    if (Object.keys(permissions).includes('*')) return true;

    const rateLimitStr: string | undefined = permissions[requiredPermission];
    if (rateLimitStr == undefined) return false;

    const rateLimit = rateLimitStringSchema.safeParse(rateLimitStr);
    if (!rateLimit.success) {
      console.error(rateLimit.error);
      throw new InternalServerErrorException('Invalid rate limit configuration');
    }

    const isWithinLimit = await this.rateLimitService.checkRateLimit(user, requiredPermission, rateLimit.data);
    if (!isWithinLimit) throw new TooManyRequestsException();

    await this.rateLimitService.logRateLimit(user, requiredPermission);

    return isWithinLimit;
  }
}
