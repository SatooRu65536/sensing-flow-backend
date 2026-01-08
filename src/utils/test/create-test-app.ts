import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { ValidationPipe } from '@nestjs/common';

export async function createTestApp(imports: any[]) {
  const authGuardRef: { current?: JwtAuthGuardMock } = {};

  const moduleRef = await Test.createTestingModule({
    imports,
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
    ],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();

  if (!authGuardRef.current) {
    throw new Error('authGuard not initialized');
  }

  return { app, authGuard: authGuardRef.current };
}
