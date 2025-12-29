import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from './jwt.schema';

export const Authed = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user: UserPayload }>();
  return request.user;
});
