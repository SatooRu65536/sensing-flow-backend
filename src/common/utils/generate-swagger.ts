import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';

export function generateSwaggerJson(app: INestApplication, swaggerJsonPath: string) {
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

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  writeFileSync(swaggerJsonPath, JSON.stringify(document, null, 2), { encoding: 'utf8' });
}
