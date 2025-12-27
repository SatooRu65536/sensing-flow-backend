import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import bodyParser from 'body-parser';

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

  await nestApp.init();

  if (!process.env.VITE_START) {
    await nestApp.listen(3000);
  }

  return nestApp;
}
