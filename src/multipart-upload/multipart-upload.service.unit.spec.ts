import { Test, TestingModule } from '@nestjs/testing';
import { MultipartUploadService } from './multipart-upload.service';
import { SensorUploadRecordT } from './multipart-upload.model';
import { MultiPartUpload } from './multipart-upload.dto';
import { S3Service } from '@/s3/s3.service';
import {
  CompleteMultipartUploadCommandOutput,
  CreateMultipartUploadCommandOutput,
  UploadPartCommandOutput,
} from '@aws-sdk/client-s3';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DrizzleDuplicateError } from '@/common/errors/drizzle-duplicate.srror';
import { DbMock, createDbServiceMock, createS3ServiceMock } from '@/common/utils/test/service-mocks';
import { createSensorUpload, createUser } from '@/common/utils/test/test-factories';

describe('MultipartUploadService', () => {
  let multipartUploadService: MultipartUploadService;
  let s3Service: S3Service;
  let dbMock: DbMock;

  beforeEach(async () => {
    dbMock = createDbServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultipartUploadService,
        {
          provide: S3Service,
          useValue: createS3ServiceMock(),
        },
        {
          provide: 'DRIZZLE_DB',
          useValue: dbMock,
        },
      ],
    }).compile();

    multipartUploadService = module.get<MultipartUploadService>(MultipartUploadService);
    s3Service = module.get<S3Service>(S3Service);
  });

  describe('listSensorUploads', () => {
    it('アップロード中のセンサーデータ一覧を取得できる', async () => {
      const user = createUser();
      const sensorUploads: SensorUploadRecordT[] = [
        createSensorUpload({
          id: '00000000-0000-0000-0000-000000000001',
          s3uploadId: 's3uploadid_1',
          dataName: 'data_1',
        }),
        createSensorUpload({
          id: '00000000-0000-0000-0000-000000000002',
          s3uploadId: 's3uploadid_2',
          dataName: 'data_2',
        }),
      ];

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findMany').mockResolvedValue(sensorUploads);

      const result = await multipartUploadService.listSensorUploads(user);
      expect(result.sensorUploads).toHaveLength(sensorUploads.length);
      expect(result.sensorUploads[0]).toEqual({
        uploadId: sensorUploads[0].id,
        dataName: sensorUploads[0].dataName,
        status: sensorUploads[0].status,
        createdAt: sensorUploads[0].createdAt,
        updatedAt: sensorUploads[0].updatedAt,
      } satisfies MultiPartUpload);
    });

    it('アップロード中のセンサーデータがない場合、空配列を返す', async () => {
      const user = createUser();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findMany').mockResolvedValue([]);

      const result = await multipartUploadService.listSensorUploads(user);
      expect(result.sensorUploads).toHaveLength(0);
    });
  });

  describe('startSensorUpload', () => {
    it('マルチパートアップロードを開始できる', async () => {
      const user = createUser();
      const uploadId = '00000000-0000-0000-0000-000000000000';
      const dataName = 'sensor_data';

      vi.spyOn(s3Service, 'createMultipartUpload').mockResolvedValue({
        UploadId: 's3-upload-id',
      } as CreateMultipartUploadCommandOutput);
      vi.spyOn(dbMock, '$returningId').mockResolvedValue([{ id: uploadId }]);

      const result = await multipartUploadService.startSensorUpload(user, { dataName });

      expect(result).toEqual({ dataName, uploadId: uploadId });
    });

    it('S3の uplloadId が取得できなかった場合、例外を投げる', async () => {
      const user = createUser();
      const dataName = 'sensor_data';

      vi.spyOn(s3Service, 'createMultipartUpload').mockResolvedValue({} as CreateMultipartUploadCommandOutput);

      await expect(multipartUploadService.startSensorUpload(user, { dataName })).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('S3のマルチパートアップロード作成に失敗した場合、例外を投げる', async () => {
      const user = createUser();
      const dataName = 'sensor_data';

      vi.spyOn(s3Service, 'createMultipartUpload').mockRejectedValue(new Error('S3 create error'));

      await expect(multipartUploadService.startSensorUpload(user, { dataName })).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('センサーデータのアップロードレコードが作成できなかった場合、例外を投げる', async () => {
      const user = createUser();
      const dataName = 'sensor_data';

      vi.spyOn(s3Service, 'createMultipartUpload').mockResolvedValue({
        UploadId: 's3-upload-id',
      } as CreateMultipartUploadCommandOutput);
      vi.spyOn(dbMock, '$returningId').mockResolvedValue([]);

      await expect(multipartUploadService.startSensorUpload(user, { dataName })).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('既存のアップロードIDでレコード作成しようとした場合、例外を投げる', async () => {
      const user = createUser();
      const dataName = 'sensor_data';

      vi.spyOn(s3Service, 'createMultipartUpload').mockResolvedValue({
        UploadId: 's3-upload-id',
      } as CreateMultipartUploadCommandOutput);
      vi.spyOn(dbMock, '$returningId').mockRejectedValue(new DrizzleDuplicateError());

      await expect(multipartUploadService.startSensorUpload(user, { dataName })).rejects.toThrow(BadRequestException);
    });

    it('不明なエラーが発生した場合、例外を投げる', async () => {
      const user = createUser();
      const dataName = 'sensor_data';

      vi.spyOn(s3Service, 'createMultipartUpload').mockResolvedValue({
        UploadId: 's3-upload-id',
      } as CreateMultipartUploadCommandOutput);
      vi.spyOn(dbMock, 'insert').mockRejectedValue(new Error('Some DB error'));

      await expect(multipartUploadService.startSensorUpload(user, { dataName })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('postMultipartUpload', () => {
    it('マルチパートアップロードのパーツ情報を登録できる（初回）', async () => {
      const user = createUser();
      const etag = 'etag_example';
      const sensorUpload = createSensorUpload({
        parts: [],
      });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'postMultipartUpload').mockResolvedValue({ ETag: etag } as UploadPartCommandOutput);

      const result = await multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example');

      expect(result).toEqual({ uploadId: sensorUpload.id, dataName: sensorUpload.dataName });
    });

    it('マルチパートアップロードのパーツ情報を登録できる（複数回目）', async () => {
      const user = createUser();
      const etag = 'etag_example';
      const sensorUpload = createSensorUpload({
        parts: [
          { etag, partNumber: 1 },
          { etag, partNumber: 3 },
          { etag, partNumber: 2 },
        ],
      });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'postMultipartUpload').mockResolvedValue({ ETag: etag } as UploadPartCommandOutput);

      const result = await multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example');

      expect(result).toEqual({ uploadId: sensorUpload.id, dataName: sensorUpload.dataName });
      expect(vi.spyOn(s3Service, 'postMultipartUpload').mock.calls[0][2]).toBe(4); // partNumber が 4 になっていることを確認
    });

    it('存在しないアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(
        multipartUploadService.postMultipartUpload(user, 'nonexistent-upload-id', 'csv,content,example'),
      ).rejects.toThrow(NotFoundException);
    });

    it('完了済みのアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'completed' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);

      await expect(
        multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example'),
      ).rejects.toThrow(BadRequestException);
    });

    it('中断済みのアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'aborted' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);

      await expect(
        multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example'),
      ).rejects.toThrow(BadRequestException);
    });

    it('ETagが取得できなかった場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'postMultipartUpload').mockResolvedValue({} as UploadPartCommandOutput);

      await expect(
        multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('トランザクション内でマルチパートアップロードが取得できなかった場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();
      const etag = 'etag_example';

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst')
        .mockResolvedValueOnce(sensorUpload) // 1回目の呼び出し
        .mockResolvedValueOnce(undefined); // 2回目の呼び出し（トランザクション内）
      vi.spyOn(s3Service, 'postMultipartUpload').mockResolvedValue({ ETag: etag } as UploadPartCommandOutput);

      await expect(
        multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example'),
      ).rejects.toThrow(NotFoundException);
    });

    it('不明なエラーが発生した場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();
      const etag = 'etag_example';

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'postMultipartUpload').mockResolvedValue({ ETag: etag } as UploadPartCommandOutput);
      vi.spyOn(dbMock, 'transaction').mockRejectedValue(new Error('Some transaction error'));

      await expect(
        multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('S3のアップロードに失敗した場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'postMultipartUpload').mockRejectedValue(new Error('S3 upload error'));

      await expect(
        multipartUploadService.postMultipartUpload(user, sensorUpload.id, 'csv,content,example'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('completeSensorUpload', () => {
    it('マルチパートアップロードを完了できる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'completeMultipartUpload').mockResolvedValue({} as CompleteMultipartUploadCommandOutput);

      const result = await multipartUploadService.completeSensorUpload(user, sensorUpload.id);

      expect(result).toEqual({ uploadId: sensorUpload.id, dataName: sensorUpload.dataName });
    });

    it('存在しないアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(multipartUploadService.completeSensorUpload(user, 'nonexistent-upload-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('完了済みのアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'completed' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);

      await expect(multipartUploadService.completeSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('中断済みのアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'aborted' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);

      await expect(multipartUploadService.completeSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ステータスの更新に失敗した場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(dbMock, 'where').mockRejectedValue(new Error('DB update error'));
      vi.spyOn(s3Service, 'completeMultipartUpload').mockResolvedValue({} as CompleteMultipartUploadCommandOutput);

      await expect(multipartUploadService.completeSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('センサーデータの登録に失敗した場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(dbMock, 'insert').mockRejectedValue(new Error('DB insert error'));
      vi.spyOn(s3Service, 'completeMultipartUpload').mockResolvedValue({} as CompleteMultipartUploadCommandOutput);

      await expect(multipartUploadService.completeSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('S3のマルチパートアップロード完了に失敗した場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'completeMultipartUpload').mockRejectedValue(new Error('S3 complete error'));

      await expect(multipartUploadService.completeSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('abortSensorUpload', () => {
    it('マルチパートアップロードを中断できる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'in_progress' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);

      const result = await multipartUploadService.abortSensorUpload(user, sensorUpload.id);

      expect(result).toEqual({
        uploadId: sensorUpload.id,
        dataName: sensorUpload.dataName,
        status: 'aborted',
        createdAt: sensorUpload.createdAt,
        updatedAt: sensorUpload.updatedAt,
      });
    });

    it('存在しないアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(multipartUploadService.abortSensorUpload(user, 'nonexistent-upload-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('完了済みのアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'completed' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);

      await expect(multipartUploadService.abortSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('中断済みのアップロードIDの場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'aborted' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);

      await expect(multipartUploadService.abortSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('S3のマルチパートアップロード中断に失敗した場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'in_progress' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(s3Service, 'abortMultipartUpload').mockRejectedValue(new Error('S3 abort error'));

      await expect(multipartUploadService.abortSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('センサーデータのステータス更新に失敗した場合、例外を投げる', async () => {
      const user = createUser();
      const sensorUpload = createSensorUpload({ status: 'in_progress' });

      vi.spyOn(dbMock.query.MultipartUploadSchema, 'findFirst').mockResolvedValue(sensorUpload);
      vi.spyOn(dbMock, 'update').mockRejectedValue(new Error('DB update error'));

      await expect(multipartUploadService.abortSensorUpload(user, sensorUpload.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
