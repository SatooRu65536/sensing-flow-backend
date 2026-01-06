import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export const USE_RAW_JWT_PAYLOAD = 'USE_RAW_JWT_PAYLOAD';
export function BeforeRegister() {
  return applyDecorators(
    SetMetadata(USE_RAW_JWT_PAYLOAD, true), // swagger に BearerAuth を追加
    ApiBearerAuth('jwt'),
  );
}
