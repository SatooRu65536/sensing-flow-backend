import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { AppModuleMock } from '@/app.module.mock';
import { createTestApp } from '@/common/utils/test/create-test-app';
import { seedUsers } from '@/_seed/users';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { seedSensorData } from '@/_seed/sensor-data';
import {
  GetSensorDataPresignedUrlResponse,
  GetSensorDataResponse,
  ListSensorDataResponse,
  UploadSensorDataRequest,
  UploadSensorDataResponse,
} from './sensor-data.dto';
import { S3Service } from '@/s3/s3.service';
import { SensorDataId, sensorDataIdSchema, sensorDataNameSchema, userIdSchema } from '@/types/brand';

describe('SensorData', () => {
  const userId = userIdSchema.parse('test-user-id');
  const sensorDataCount = 12;
  const s3service = new S3Service();
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;
  let sensorDataId: SensorDataId;

  beforeAll(async () => {
    ({ app, authGuard } = await createTestApp({ imports: [AppModuleMock] }));
  });

  beforeEach(async () => {
    sensorDataId = sensorDataIdSchema.parse('test-sensor-data-id');
    const folderS3Key = s3service.generateFileS3Key(userId, sensorDataId, 'accelerometer');
    await s3service.putObject(folderS3Key, Buffer.from('this,is,a,test,csv,data'));

    await seedUsers({ userIds: [userId] });
    const sensorDataIds = await seedSensorData([userId], {
      count: sensorDataCount,
      additional: [
        {
          id: sensorDataId,
          userId,
          folderS3Key,
          dataName: sensorDataNameSchema.parse('test-sensor-data'),
          activeSensors: ['accelerometer'],
        },
      ],
    });
    if (sensorDataIds.length === 0) {
      throw new Error('センサデータのシードに失敗しました');
    }
  });

  afterEach(() => {
    authGuard.resetUser();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /sensor-data', () => {
    it('[200] 取得', async () => {
      authGuard.setUser({ user: { id: userId } });

      // 1ページ目
      const res = await request(app.getHttpServer()).get('/sensor-data');

      expect(res.status).toBe(200);

      const dto = plainToInstance(ListSensorDataResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('[200] ページング', async () => {
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

    it('[200] 件数指定', async () => {
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

  describe('POST /sensor-data', () => {
    it('[207] ファイルアップロードできる', async () => {
      const fileBuffer = Buffer.from('col1,col2,col3\n1,2,3\n4,5,6');
      const body: UploadSensorDataRequest = {
        dataName: sensorDataNameSchema.parse('uploaded-data'),
        createdAt: new Date(),
      };

      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .post('/sensor-data')
        .field('dataName', body.dataName)
        .field('createdAt', body.createdAt.toISOString())
        .attach('files', fileBuffer, {
          filename: 'accelerometer.csv',
          contentType: 'csv',
        });

      expect(res.status).toBe(207);

      const dto = plainToInstance(UploadSensorDataResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.dataName).toBe(body.dataName);
    });

    it('[400] ファイル未添付', async () => {
      const body: UploadSensorDataRequest = {
        dataName: sensorDataNameSchema.parse('uploaded-data'),
        createdAt: new Date(),
      };

      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).post('/sensor-data').field('dataName', body.dataName);

      expect(res.status).toBe(400);
    });

    it('[400] センサデータ名未指定', async () => {
      const fileBuffer = Buffer.from('col1,col2,col3\n1,2,3\n4,5,6');

      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).post('/sensor-data').attach('file', fileBuffer, {
        filename: 'test-upload.csv',
        contentType: 'csv',
      });

      expect(res.status).toBe(400);
    });

    it('[400] センサデータ名が空文字列', async () => {
      const fileBuffer = Buffer.from('col1,col2,col3\n1,2,3\n4,5,6');
      const body: UploadSensorDataRequest = {
        dataName: sensorDataNameSchema.parse(''),
        createdAt: new Date(),
      };

      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .post('/sensor-data')
        .field('dataName', body.dataName)
        .attach('file', fileBuffer, {
          filename: 'test-upload.csv',
          contentType: 'csv',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /sensor-data/:id', () => {
    it('[200] 取得', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).get(`/sensor-data/${sensorDataId}`);

      expect(res.status).toBe(200);

      const dto = plainToInstance(GetSensorDataResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.id).toBe(sensorDataId);
    });

    it('[404] 存在しないID', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).get('/sensor-data/invalid-sensor-data-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /sensor-data/:id', () => {
    it('[200] 更新', async () => {
      const newDataName = 'updated-data-name';

      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .patch(`/sensor-data/${sensorDataId}`)
        .send({ dataName: newDataName });

      expect(res.status).toBe(200);

      const dto = plainToInstance(GetSensorDataResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.dataName).toBe(newDataName);
    });

    it('[404] 存在しないID', async () => {
      const newDataName = 'updated-data-name';

      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .patch('/sensor-data/invalid-sensor-data-id')
        .send({ dataName: newDataName });

      expect(res.status).toBe(404);
    });

    it('[400] センサデータ名が空文字列', async () => {
      const newDataName = '';

      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .patch(`/sensor-data/${sensorDataId}`)
        .send({ dataName: newDataName });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /sensor-data/:id', () => {
    it('[204] 削除', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).delete(`/sensor-data/${sensorDataId}`);

      expect(res.status).toBe(200);
    });

    it('[404] 存在しないID', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).delete('/sensor-data/invalid-sensor-data-id');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /sensor-data/:id/presigned-url', () => {
    it('[200] 取得', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).get(`/sensor-data/${sensorDataId}/presigned-url`);

      expect(res.status).toBe(200);

      const dto = plainToInstance(GetSensorDataPresignedUrlResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);

      expect(dto.urls).toBeDefined();
      expect(() => new URL(dto.urls[0].presignedUrl)).not.toThrow(); // URL形式か
    });

    it('[404] 存在しないID', async () => {
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
