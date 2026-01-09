import { App } from 'supertest/types';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';

describe('AppModule', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('[200] 取得できる', async () => {
      const res = await request(app.getHttpServer()).get('/');

      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello World!');
    });
  });

  describe('GET /hello', () => {
    it('[200] 取得できる', async () => {
      const res = await request(app.getHttpServer()).get('/hello');

      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello World!');
    });
  });
});
