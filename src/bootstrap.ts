import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogLevel, ValidationPipe } from '@nestjs/common';
import bodyParser from 'body-parser';
import { generatePermissionEnumSchema } from '@/common/utils/generate-permission-enum-schema';
import { generateSwaggerJson } from '@/common/utils/generate-swagger';

export async function bootstrap() {
  const loggerLevels: LogLevel[] = ['warn', 'error', 'debug', 'log'];
  const nestApp = await NestFactory.create(AppModule, { logger: loggerLevels });

  nestApp.enableCors({
    origin: '*',
    credentials: true,
    allowedHeaders: ['Accept', 'Authorization', 'Access-Control-Allow-Origin', 'Content-Type', 'Origin'],
  });

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  nestApp.enableShutdownHooks();
  nestApp.use(bodyParser.json({ limit: '15mb' }));
  nestApp.use(bodyParser.text({ type: 'text/csv', limit: '100mb' }));

  if (process.env.ENV === 'development') {
    generateSwaggerJson(nestApp, 'swagger.json');
    generatePermissionEnumSchema('permissions.gen.ts', 'plans.schema.json');
  }

  await nestApp.init();

  if (process.env.ENV === 'development') {
    await nestApp.listen(5173);
  }

  return nestApp;
}
