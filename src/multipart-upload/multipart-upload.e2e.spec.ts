import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuardMock } from '@/auth/jwt-auth.guard.mock';
import { AppModuleMock } from '@/app.module.mock';
import { createTestApp } from '@/common/utils/test/create-test-app';
import { seedUsers } from '@/_seed/users';
import { seedMultipartUploads } from '@/_seed/multipart-upload';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import {
  AbortMultipartUploadResponse,
  CompleteMultipartUploadResponse,
  ListMultipartUploadResponse,
  StartMultipartUploadRequest,
  StartMultipartUploadResponse,
} from './multipart-upload.dto';
import { validate } from 'class-validator';
import { S3Service } from '@/s3/s3.service';

describe('MultipartUpload', () => {
  const userId = 'test-user-id';
  const s3service = new S3Service();
  const startedUploadId = 'test-upload-id';
  let app: INestApplication<App>;
  let authGuard: JwtAuthGuardMock;

  beforeAll(async () => {
    ({ app, authGuard } = await createTestApp({ imports: [AppModuleMock] }));
  });

  beforeEach(async () => {
    const userIds = await seedUsers({ userIds: [userId] });
    const s3key = s3service.getMultipartUploadKey(userId, startedUploadId);
    const { UploadId } = await s3service.createMultipartUpload(s3key);
    const { ETag } = await s3service.postMultipartUpload(
      s3key,
      UploadId!,
      1,
      Buffer.from('this,is,a,test,csv,data').toString('base64'),
    );

    await seedMultipartUploads(userIds, {
      count: 20,
      additional: [
        {
          id: startedUploadId,
          userId,
          parts: [
            {
              etag: ETag!,
              partNumber: 1,
            },
          ],
          dataName: `multipart-upload-started`,
          s3uploadId: UploadId!,
          status: 'in_progress',
        },
      ],
    });
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

      const res = await request(app.getHttpServer()).get('/multipart-upload');

      expect(res.status).toBe(200);

      const dto = plainToInstance(ListMultipartUploadResponse, res.body);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('POST /multipart-upload', () => {
    it('[201] 開始できる', async () => {
      const dataName = 'test-data';
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .post('/multipart-upload')
        .send({ dataName } satisfies StartMultipartUploadRequest);

      expect(res.status).toBe(201);

      const dto = plainToInstance(StartMultipartUploadResponse, res.body);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(instanceToPlain(dto)).toMatchObject({ dataName });
    });

    it('[400] リクエストボディがない場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).post('/multipart-upload');

      expect(res.status).toBe(400);
    });

    it('[400] リクエストボディが空の場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).post('/multipart-upload').send({});

      expect(res.status).toBe(400);
    });

    it('[400] リクエストボディが誤りの場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).post('/multipart-upload').send({ dataName: 123 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /multipart-upload/:uploadId', () => {
    it('[200] アップロードできる', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .put(`/multipart-upload/${startedUploadId}`)
        .set('Content-Type', 'text/csv')
        .send('this,is,a,test,csv,data');

      expect(res.status).toBe(200);

      const dto = plainToInstance(StartMultipartUploadResponse, res.body);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(instanceToPlain(dto)).toMatchObject({
        uploadId: startedUploadId,
      });
    });

    it('[400] Content-Type が CSV でない場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .put(`/multipart-upload/${startedUploadId}`)
        // .set('Content-Type', 'text/csv')
        .send('this,is,a,test,csv,data');

      expect(res.status).toBe(400);
    });

    it('[400] リクエストボディが空の場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .put(`/multipart-upload/${startedUploadId}`)
        .set('Content-Type', 'text/csv')
        .send('');

      expect(res.status).toBe(400);
    });

    it('[404] アップロードIDが存在しない場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer())
        .put(`/multipart-upload/non-existent-upload-id`)
        .set('Content-Type', 'text/csv')
        .send('this,is,a,test,csv,data');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /multipart-upload/:uploadId', () => {
    it('[200] 完了できる', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).patch(`/multipart-upload/${startedUploadId}`);

      expect(res.status).toBe(200);

      const dto = plainToInstance(CompleteMultipartUploadResponse, res.body);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(instanceToPlain(dto)).toMatchObject({
        uploadId: startedUploadId,
      });
    });

    it('[404] アップロードIDが存在しない場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).patch(`/multipart-upload/non-existent-upload-id`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /multipart-upload/:uploadId', () => {
    it('[200] 中止できる', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).delete(`/multipart-upload/${startedUploadId}`);

      expect(res.status).toBe(200);

      const dto = plainToInstance(AbortMultipartUploadResponse, res.body);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(instanceToPlain(dto)).toMatchObject({
        uploadId: startedUploadId,
      });
    });

    it('[404] アップロードIDが存在しない場合', async () => {
      authGuard.setUser({ user: { id: userId } });

      const res = await request(app.getHttpServer()).delete(`/multipart-upload/non-existent-upload-id`);

      expect(res.status).toBe(404);
    });
  });
});
