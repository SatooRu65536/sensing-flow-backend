import { Test, TestingModule } from '@nestjs/testing';
import { createDbServiceMock, createS3ServiceMock, DbMock } from '@/common/utils/test/service-mocks';
import { SensorDataService } from './sensor-data.service';
import { createSensorData, createUser } from '@/common/utils/test/test-factories';
import {
  GetSensorDataPresignedUrlResponse,
  GetSensorDataResponse,
  SensorData,
  UpdateSensorDataResponse,
} from './sensor-data.dto';
import { S3Service } from '@/s3/s3.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DeleteObjectCommandOutput, PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { DrizzleDuplicateError } from '@/common/errors/drizzle-duplicate.srror';

describe('SensorDataService', () => {
  let sensorDataService: SensorDataService;
  let s3Service: S3Service;
  let dbMock: DbMock;

  beforeEach(async () => {
    dbMock = createDbServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorDataService,
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

    sensorDataService = module.get<SensorDataService>(SensorDataService);
    s3Service = module.get<S3Service>(S3Service);
  });

  describe('listSensorData', () => {
    it('センサーデータのリストを取得できる', async () => {
      const user = createUser();
      const sensorData = [
        createSensorData({
          id: '00000000-0000-0000-0000-000000000001',
          dataName: 'Sensor Data 1',
          userId: user.id,
        }),
        createSensorData({
          id: '00000000-0000-0000-0000-000000000002',
          dataName: 'Sensor Data 2',
          userId: user.id,
        }),
      ];
      vi.spyOn(dbMock.query.SensorDataSchema, 'findMany').mockResolvedValue(sensorData);

      const result = await sensorDataService.listSensorData(user, 1, 10);
      expect(result.sensorData).toHaveLength(sensorData.length);
      expect(result.sensorData[0]).toStrictEqual({
        id: sensorData[0].id,
        dataName: sensorData[0].dataName,
        createdAt: sensorData[0].createdAt,
        updatedAt: sensorData[0].updatedAt,
      } satisfies SensorData);
    });

    it('センサーデータが存在しない場合、空のリストを返す', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findMany').mockResolvedValue([]);

      const result = await sensorDataService.listSensorData(user, 1, 10);
      expect(result.sensorData).toHaveLength(0);
    });
  });

  describe('uploadSensorDataFile', () => {
    it('センサーデータファイルをアップロードできる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });
      const fileBuffer = Buffer.from('sensor,data,content');
      const file = {
        originalname: 'sensor_data.csv',
        buffer: fileBuffer,
      } as Express.Multer.File;
      const body = {
        dataName: sensorDataRecord.dataName,
      };

      vi.spyOn(s3Service, 'putObject').mockResolvedValue({} as PutObjectCommandOutput);
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);

      const result = await sensorDataService.uploadSensorDataFile(user, body, file);
      expect(result).toMatchObject({
        dataName: body.dataName,
      });
      const s3key = s3Service.getUploadS3Key(user.id, result.id);
      expect(vi.spyOn(s3Service, 'putObject')).toHaveBeenCalledWith(s3key, fileBuffer);
    });

    it('センサーデータのメタデータの保存に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const fileBuffer = Buffer.from('sensor,data,content');
      const file = {
        originalname: 'sensor_data.csv',
        buffer: fileBuffer,
      } as Express.Multer.File;
      const body = {
        dataName: 'Test Sensor Data',
      };

      vi.spyOn(dbMock, 'insert').mockRejectedValue(new Error('DB error'));

      await expect(sensorDataService.uploadSensorDataFile(user, body, file)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(vi.spyOn(s3Service, 'putObject')).not.toHaveBeenCalled();
    });

    it('アップロードに失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const fileBuffer = Buffer.from('sensor,data,content');
      const file = {
        originalname: 'sensor_data.csv',
        buffer: fileBuffer,
      } as Express.Multer.File;
      const body = {
        dataName: 'Test Sensor Data',
      };

      vi.spyOn(s3Service, 'putObject').mockRejectedValue(new Error('S3 error'));

      await expect(sensorDataService.uploadSensorDataFile(user, body, file)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(vi.spyOn(dbMock, 'insert')).toHaveBeenCalled();
      expect(vi.spyOn(s3Service, 'putObject')).toHaveBeenCalled();
      expect(vi.spyOn(dbMock, 'rollback')).toHaveBeenCalled();
    });

    it('重複エラーの場合は DUPLICATE_ENTRY を返す', async () => {
      const user = createUser();
      const fileBuffer = Buffer.from('sensor,data,content');
      const file = {
        originalname: 'sensor_data.csv',
        buffer: fileBuffer,
      } as Express.Multer.File;
      const body = {
        dataName: 'Test Sensor Data',
      };

      vi.spyOn(dbMock, 'values').mockRejectedValue(new DrizzleDuplicateError());
      await expect(sensorDataService.uploadSensorDataFile(user, body, file)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('作成後のセンサーデータの取得に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const fileBuffer = Buffer.from('sensor,data,content');
      const file = {
        originalname: 'sensor_data.csv',
        buffer: fileBuffer,
      } as Express.Multer.File;
      const body = {
        dataName: 'Test Sensor Data',
      };

      vi.spyOn(s3Service, 'putObject').mockResolvedValue({} as PutObjectCommandOutput);
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.uploadSensorDataFile(user, body, file)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getSensorData', () => {
    it('センサーデータを取得できる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);

      const result = await sensorDataService.getSensorData(user, sensorDataRecord.id);
      expect(result).toStrictEqual({
        id: sensorDataRecord.id,
        dataName: sensorDataRecord.dataName,
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
      } satisfies GetSensorDataResponse);
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.getSensorData(user, 'non-exist-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSensorData', () => {
    it('センサーデータを更新できる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });
      const updatedDataName = 'Updated Sensor Data Name';

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue({
        ...sensorDataRecord,
        dataName: updatedDataName,
      });

      const result = await sensorDataService.updateSensorData(user, sensorDataRecord.id, {
        dataName: updatedDataName,
      });
      expect(result).toStrictEqual({
        id: sensorDataRecord.id,
        dataName: updatedDataName,
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
      } satisfies UpdateSensorDataResponse);
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.updateSensorData(user, 'non-exist-id', { dataName: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('更新後のセンサーデータの取得に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst')
        .mockResolvedValueOnce(sensorDataRecord) // 最初の呼び出しは既存のデータを返す
        .mockResolvedValueOnce(undefined); // 2回目の呼び出しはundefinedを返す

      await expect(
        sensorDataService.updateSensorData(user, sensorDataRecord.id, { dataName: 'New Name' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteSensorData', () => {
    it('センサーデータを削除できる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(s3Service, 'deleteObject').mockResolvedValue({} as DeleteObjectCommandOutput);

      const result = await sensorDataService.deleteSensorData(user, sensorDataRecord.id);
      expect(result).toBeUndefined();
      expect(vi.spyOn(s3Service, 'deleteObject')).toHaveBeenCalledWith(sensorDataRecord.s3key);
      expect(vi.spyOn(dbMock, 'delete')).toHaveBeenCalled();
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.deleteSensorData(user, 'non-exist-id')).rejects.toThrow(NotFoundException);
    });

    it('削除処理に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(dbMock, 'delete').mockRejectedValue(new Error('DB error'));

      await expect(sensorDataService.deleteSensorData(user, sensorDataRecord.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(vi.spyOn(s3Service, 'deleteObject')).not.toHaveBeenCalled();
    });

    it('削除に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(s3Service, 'deleteObject').mockRejectedValue(new Error('S3 error'));

      await expect(sensorDataService.deleteSensorData(user, sensorDataRecord.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(vi.spyOn(dbMock, 'delete')).toHaveBeenCalled();
      expect(vi.spyOn(s3Service, 'deleteObject')).toHaveBeenCalled();
      expect(vi.spyOn(dbMock, 'rollback')).toHaveBeenCalled();
    });
  });

  describe('getSensorDataPresignedUrl', () => {
    it('センサーデータのpresigned URLを取得できる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData();
      const presignedUrl = 'https://example.com/presigned-url';

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(s3Service, 'getPresignedUrl').mockResolvedValue(presignedUrl);

      const result = await sensorDataService.getSensorDataPresignedUrl(user, sensorDataRecord.id);
      expect(result).toStrictEqual({
        id: sensorDataRecord.id,
        dataName: sensorDataRecord.dataName,
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        presignedUrl,
      } satisfies GetSensorDataPresignedUrlResponse);
      expect(vi.spyOn(s3Service, 'getPresignedUrl')).toHaveBeenCalledWith(
        sensorDataRecord.s3key,
        `${sensorDataRecord.dataName}.csv`,
      );
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.getSensorDataPresignedUrl(user, 'non-exist-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('presigned URLの取得に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData();

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(s3Service, 'getPresignedUrl').mockRejectedValue(new Error('S3 error'));

      await expect(sensorDataService.getSensorDataPresignedUrl(user, sensorDataRecord.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
