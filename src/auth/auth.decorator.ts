import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@/users/users.dto';

export const Authed = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
  return request.user;
});
