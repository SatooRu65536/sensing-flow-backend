import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/decorators/auth.decorator';
import { USE_RAW_JWT_PAYLOAD } from '../common/decorators/before-register.decorator';
import { User } from '@/users/users.dto';
import { UserPayload } from './jwt.schema';
import { createUser, createUserPayload } from '@/common/utils/test/test-factories';

interface JwtAuthGuardMockOverride {
  user: Partial<User>;
  userPayload?: Partial<UserPayload>;
}

@Injectable()
export class JwtAuthGuardMock implements CanActivate {
  constructor(
    private reflector: Reflector,
    private override?: JwtAuthGuardMockOverride,
  ) {}

  setUser(override: JwtAuthGuardMockOverride) {
    this.override = override;
  }

  resetUser() {
    this.override = undefined;
  }

  canActivate(context: ExecutionContext) {
    // Public はそのまま通す
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) return true;

    // JWT 認証をスキップ

    // Raw Payload 指定がなければユーザー情報を付与
    const useRawPayload = this.reflector.get<boolean>(USE_RAW_JWT_PAYLOAD, context.getHandler());
    const request = context.switchToHttp().getRequest<Request & { user: UserPayload | User }>();

    if (!useRawPayload) {
      request.user = createUser(this.override?.user);
    } else {
      request.user = createUserPayload(this.override?.userPayload);
    }

    return true;
  }
}
