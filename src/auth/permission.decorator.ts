import { PermissionEnum } from '@/permissions.gen';
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export const PERMISSION_KEY = 'permission';
export function Permission(permission: PermissionEnum | (string & {})) {
  return applyDecorators(
    SetMetadata('permission', permission),
    ApiBearerAuth('jwt'), // swagger に BearerAuth を追加
  );
}

export function AuthorizationApi() {
  return ApiBearerAuth('jwt');
}
