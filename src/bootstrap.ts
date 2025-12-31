import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { generatePermissionEnumSchema } from './plans-config/plans-config.schema';

export async function bootstrap() {
  const nestApp = await NestFactory.create(AppModule);

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

  if (process.env.ENV_DEV === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Sensing Flow API')
      .setDescription('API documentation for Sensing Flow')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'jwt',
          description: 'Enter your JWT',
          in: 'header',
        },
        'jwt',
      )
      .build();

    const document = SwaggerModule.createDocument(nestApp, config);
    SwaggerModule.setup('docs', nestApp, document);
  }

  if (process.env.ENV_DEV === 'true') {
    generatePermissionEnumSchema();
  }

  await nestApp.init();

  if (process.env.ENV_DEV === 'true') {
    await nestApp.listen(5173);
  }

  return nestApp;
}
