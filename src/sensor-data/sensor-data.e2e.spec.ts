import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { AppModuleMock } from '@/app.module.mock';
import { createTestApp } from '@/common/utils/test/create-test-app';
import { seedUsers } from '@/_seed/users';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { seedSensorData } from '@/_seed/sensor-data';
import { GetSensorDataPresignedUrlResponse, ListSensorDataResponse } from './sensor-data.dto';
import { S3Service } from '@/s3/s3.service';

describe('SensorData', () => {
  const userId = 'test-user-id';
  const sensorDataCount = 12;
  const s3service = new S3Service();
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;
  let sensorDataId: string;

  beforeAll(async () => {
    ({ app, authGuard } = await createTestApp({ imports: [AppModuleMock] }));
  });

  beforeEach(async () => {
    const dataName = 'test-data';
    const s3key = s3service.getUploadS3Key(userId, dataName);
    await s3service.putObject(s3key, Buffer.from('this,is,a,test,csv,data'));

    await seedUsers({ userIds: [userId] });
    const sensorDataIds = await seedSensorData([userId], {
      count: sensorDataCount,
      additional: [
        {
          userId,
          s3key,
          dataName,
        },
      ],
    });
    if (sensorDataIds.length === 0) {
      throw new Error('センサデータのシードに失敗しました');
    }
    sensorDataId = sensorDataIds[0];
  });

  afterEach(() => {
    authGuard.resetUser();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /multipart-upload', () => {
    it('[200] 取得できる', async () => {
      authGuard.setUser({ user: { id: userId } });

      // 1ページ目
      const res = await request(app.getHttpServer()).get('/sensor-data');

      expect(res.status).toBe(200);

      const dto = plainToInstance(ListSensorDataResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('[200] ページングできる', async () => {
      authGuard.setUser({ user: { id: userId } });

      // 1ページ目
      const res1 = await request(app.getHttpServer()).get('/sensor-data');

      expect(res1.status).toBe(200);

      const dto1 = plainToInstance(ListSensorDataResponse, res1.body);
      const errors = await validate(dto1);
      expect(errors.length).toBe(0);

      const page1Count = getPageCount(sensorDataCount, 10, 1);
      expect(instanceToPlain(dto1.sensorData)).toHaveLength(page1Count); // 1ページ目の件数

      // 2ページ目
      const res2 = await request(app.getHttpServer()).get('/sensor-data').query({ page: 2, perPage: 10 });

      expect(res2.status).toBe(200);
      const dto2 = plainToInstance(ListSensorDataResponse, res2.body);
      const page2Count = getPageCount(sensorDataCount, 10, 2);
      expect(instanceToPlain(dto2.sensorData)).toHaveLength(page2Count); // 2ページ目の件数

      // 3ページ目
      const res3 = await request(app.getHttpServer()).get('/sensor-data').query({ page: 3, perPage: 10 });

      expect(res3.status).toBe(200);
      const dto3 = plainToInstance(ListSensorDataResponse, res3.body);
      const page3Count = getPageCount(sensorDataCount, 10, 3);
      expect(instanceToPlain(dto3.sensorData)).toHaveLength(page3Count); // 3ページ目の件数
    });

    it('[200] 件数指定できる', async () => {
      authGuard.setUser({ user: { id: userId } });

      // 5件取得
      const perPage5 = 5;
      const res = await request(app.getHttpServer()).get('/sensor-data').query({ perPage: perPage5 });

      expect(res.status).toBe(200);

      const dto5 = plainToInstance(ListSensorDataResponse, res.body);
      const errors = await validate(dto5);
      expect(errors.length).toBe(0);

      const pageCount = getPageCount(sensorDataCount, perPage5, 1);
      expect(instanceToPlain(dto5.sensorData)).toHaveLength(pageCount); // 件数分取得できる

      // 6件取得
      const perPage6 = 6;
      const res6 = await request(app.getHttpServer()).get('/sensor-data').query({ perPage: perPage6 });

      expect(res6.status).toBe(200);

      const dto6 = plainToInstance(ListSensorDataResponse, res6.body);
      const errors6 = await validate(dto6);
      expect(errors6.length).toBe(0);

      const pageCount6 = getPageCount(sensorDataCount, perPage6, 1);
      expect(instanceToPlain(dto6.sensorData)).toHaveLength(pageCount6); // 件数分取得できる
    });
  });

  describe('GET /sensor-data/:id/presigned-url', () => {
    it('[200] presigned URL 付きで取得できる', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).get(`/sensor-data/${sensorDataId}/presigned-url`);

      expect(res.status).toBe(200);

      const dto = plainToInstance(GetSensorDataPresignedUrlResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);

      expect(dto.presignedUrl).toBeDefined();
      expect(() => new URL(dto.presignedUrl)).not.toThrow(); // URL形式か
    });

    it('[404] 存在しないIDは取得できない', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).get('/sensor-data/invalid-sensor-data-id/presigned-url');

      expect(res.status).toBe(404);
    });
  });
});

function getPageCount(totalCount: number, pageSize: number, page: number) {
  const start = (page - 1) * pageSize;
  const remaining = totalCount - start;
  return Math.max(Math.min(remaining, pageSize), 0);
}
