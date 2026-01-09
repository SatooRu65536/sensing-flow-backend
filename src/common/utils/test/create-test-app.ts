import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { ModuleMetadata, ValidationPipe } from '@nestjs/common';
import bodyParser from 'body-parser';
import { PermissionGuard } from '@/auth/permission.guard';
import { RateLimitModule } from '@/rate-limit/rate-limit.module';

interface CreateTestAppOption {
  imports: ModuleMetadata['imports'];
  usePermissionGuard?: boolean;
}
export async function createTestApp({ imports, usePermissionGuard }: CreateTestAppOption) {
  const authGuardRef: { current?: JwtAuthGuardMock } = {};

  const moduleRef = await Test.createTestingModule({
    // imports と RateLimitService を必ず登録
    imports: [...(imports ?? []), RateLimitModule],
    providers: [
      {
        provide: APP_GUARD,
        inject: [Reflector],
        useFactory: (reflector: Reflector) => {
          const guard = new JwtAuthGuardMock(reflector);
          authGuardRef.current = guard;
          return guard;
        },
      },
      ...(usePermissionGuard
        ? [
            {
              provide: APP_GUARD,
              useClass: PermissionGuard,
            },
          ]
        : []),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  app.use(bodyParser.json({ limit: '15mb' }));
  app.use(bodyParser.text({ type: 'text/csv', limit: '100mb' }));

  await app.init();

  if (!authGuardRef.current) {
    throw new Error('authGuard not initialized');
  }

  return { app, authGuard: authGuardRef.current };
}
