import { PermissionEnum } from '@/permissions.gen';
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export const PERMISSION_KEY = 'permission';
export function Permission(permissions: PermissionEnum | (string & {})) {
  return applyDecorators(
    SetMetadata(PERMISSION_KEY, permissions),
    ApiBearerAuth('jwt'), // swagger に BearerAuth を追加
  );
}

export function AuthorizationApi() {
  return ApiBearerAuth('jwt');
}
