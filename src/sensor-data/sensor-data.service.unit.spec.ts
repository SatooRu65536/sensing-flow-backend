import { Test, TestingModule } from '@nestjs/testing';
import { createDbServiceMock, createS3ServiceMock, DbMock } from '@/common/utils/test/service-mocks';
import { SensorDataService } from './sensor-data.service';
import { createSensorData, createUser, makeFile } from '@/common/utils/test/test-factories';
import {
  GetSensorDataPresignedUrlResponse,
  GetSensorDataResponse,
  SensorData,
  UpdateSensorDataResponse,
  UploadSensorDataRequest,
  UploadSensorDataResponse,
} from './sensor-data.dto';
import { S3Service } from '@/s3/s3.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DeleteObjectCommandOutput } from '@aws-sdk/client-s3';
import { sensorDataIdSchema, sensorDataNameSchema } from '@/types/brand';
import { SensorsEnum } from './sensor-data.schema';

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
      const sensorData = [createSensorData({ userId: user.id }), createSensorData({ userId: user.id })];
      vi.spyOn(dbMock.query.SensorDataSchema, 'findMany').mockResolvedValue(sensorData);

      const result = await sensorDataService.listSensorData(user, 1, 10);
      expect(result.sensorData).toHaveLength(sensorData.length);
      expect(result.sensorData[0]).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorData[0].id),
        dataName: sensorDataNameSchema.parse(sensorData[0].dataName),
        activeSensors: sensorData[0].activeSensors,
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

  describe('uploadSensorDataFiles', () => {
    it('センサーデータファイルを全てアップロードできる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });
      const body: UploadSensorDataRequest = {
        dataName: sensorDataNameSchema.parse('Uploaded Sensor Data'),
        createdAt: new Date(),
      };
      const files = [makeFile('accelerometer'), makeFile('gyroscope')];

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue({ activeSensors: [files[0].originalname] })
        .mockResolvedValue({
          ...sensorDataRecord,
          activeSensors: [files[0].originalname],
        });

      const result = await sensorDataService.uploadSensorDataFiles(user, body, files);
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(sensorDataRecord.dataName),
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        uploadedSensors: sensorDataRecord.activeSensors,
        failedSensors: [],
      } satisfies UploadSensorDataResponse);
    });

    it('既存のセンサーデータIDが指定された場合、そのIDに紐づくデータにファイルをアップロードする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });
      const body: UploadSensorDataRequest = {
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse('Uploaded Sensor Data'),
        createdAt: new Date(),
      };
      const files = [makeFile('barometer'), makeFile('magnetometer')];

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst')
        .mockResolvedValueOnce(sensorDataRecord)
        .mockResolvedValueOnce(sensorDataRecord)
        .mockResolvedValue({
          ...sensorDataRecord,
          activeSensors: [...sensorDataRecord.activeSensors, files[0].originalname],
        });

      const result = await sensorDataService.uploadSensorDataFiles(user, body, files);
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(sensorDataRecord.dataName),
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        uploadedSensors: [files[0].originalname as SensorsEnum, files[1].originalname as SensorsEnum],
        failedSensors: [],
      } satisfies UploadSensorDataResponse);
    });

    it('存在しないIDが指定された場合、エラーをスローする', async () => {
      const user = createUser();
      const body: UploadSensorDataRequest = {
        id: sensorDataIdSchema.parse('non-exist-id'),
        dataName: sensorDataNameSchema.parse('Uploaded Sensor Data'),
        createdAt: new Date(),
      };
      const files = [makeFile('accelerometer'), makeFile('gyroscope')];

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.uploadSensorDataFiles(user, body, files)).rejects.toThrow(NotFoundException);
    });

    it('無効なセンサファイルが含まれている場合、failedSensorsに含まれる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });
      const body: UploadSensorDataRequest = {
        dataName: sensorDataNameSchema.parse('Uploaded Sensor Data'),
        createdAt: new Date(),
      };
      const files = [makeFile('invalid_sensor_name')];

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);

      const result = await sensorDataService.uploadSensorDataFiles(user, body, files);
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(sensorDataRecord.dataName),
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        uploadedSensors: [],
        failedSensors: [files[0].originalname],
      } satisfies UploadSensorDataResponse);
    });

    it('アップロード済みのセンサファイルが含まれている場合，上書きする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });
      const body: UploadSensorDataRequest = {
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse('Uploaded Sensor Data'),
        createdAt: new Date(),
      };
      const files = [makeFile('accelerometer')];

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst')
        .mockResolvedValueOnce(sensorDataRecord)
        .mockResolvedValueOnce({ activeSensors: [files[0].originalname] })
        .mockResolvedValue({
          ...sensorDataRecord,
          activeSensors: [files[0].originalname],
        });

      const result = await sensorDataService.uploadSensorDataFiles(user, body, files);
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(sensorDataRecord.dataName),
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        uploadedSensors: [files[0].originalname as SensorsEnum],
        failedSensors: [],
      } satisfies UploadSensorDataResponse);
    });

    it('アップロードに失敗した場合、failedSensorsに含まれる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });
      const body: UploadSensorDataRequest = {
        dataName: sensorDataNameSchema.parse('Uploaded Sensor Data'),
        createdAt: new Date(),
      };
      const files = [makeFile('accelerometer'), makeFile('gyroscope')];

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue({ activeSensors: [files[0].originalname] })
        .mockResolvedValue({
          ...sensorDataRecord,
          activeSensors: [files[0].originalname],
        });
      vi.spyOn(s3Service, 'putObject').mockRejectedValue(new Error('S3 upload error'));

      const result = await sensorDataService.uploadSensorDataFiles(user, body, files);
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(sensorDataRecord.dataName),
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        uploadedSensors: [],
        failedSensors: [files[0].originalname, files[1].originalname],
      } satisfies UploadSensorDataResponse);
    });

    it('センサデータの記録が取得できない場合、エラーをスローする', async () => {
      const user = createUser();
      const body: UploadSensorDataRequest = {
        dataName: sensorDataNameSchema.parse('Uploaded Sensor Data'),
        createdAt: new Date(),
      };
      const files = [makeFile('accelerometer'), makeFile('gyroscope')];

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue({ activeSensors: [files[0].originalname] })
        .mockResolvedValue(undefined); // 最終的にセンサデータの記録が取得できない

      await expect(sensorDataService.uploadSensorDataFiles(user, body, files)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSensorData', () => {
    it('センサーデータを取得できる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);

      const result = await sensorDataService.getSensorData(user, sensorDataIdSchema.parse(sensorDataRecord.id));
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(sensorDataRecord.dataName),
        activeSensors: sensorDataRecord.activeSensors,
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
      } satisfies GetSensorDataResponse);
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.getSensorData(user, sensorDataIdSchema.parse('non-exist-id'))).rejects.toThrow(
        NotFoundException,
      );
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

      const result = await sensorDataService.updateSensorData(user, sensorDataIdSchema.parse(sensorDataRecord.id), {
        dataName: sensorDataNameSchema.parse(updatedDataName),
      });
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(updatedDataName),
        activeSensors: sensorDataRecord.activeSensors,
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
      } satisfies UpdateSensorDataResponse);
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(
        sensorDataService.updateSensorData(user, sensorDataIdSchema.parse('non-exist-id'), {
          dataName: sensorDataNameSchema.parse('New Name'),
        }),
      ).rejects.toThrow(NotFoundException);
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
        sensorDataService.updateSensorData(user, sensorDataIdSchema.parse(sensorDataRecord.id), {
          dataName: sensorDataNameSchema.parse('New Name'),
        }),
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

      const result = await sensorDataService.deleteSensorData(user, sensorDataIdSchema.parse(sensorDataRecord.id));
      expect(result).toBeUndefined();
      expect(vi.spyOn(dbMock, 'delete')).toHaveBeenCalled();
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(sensorDataService.deleteSensorData(user, sensorDataIdSchema.parse('non-exist-id'))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('削除処理に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(dbMock, 'delete').mockRejectedValue(new Error('DB error'));

      await expect(
        sensorDataService.deleteSensorData(user, sensorDataIdSchema.parse(sensorDataRecord.id)),
      ).rejects.toThrow(InternalServerErrorException);
      expect(vi.spyOn(s3Service, 'deleteObject')).not.toHaveBeenCalled();
    });

    it('削除に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData({
        userId: user.id,
      });

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(s3Service, 'deleteObject').mockRejectedValue(new Error('S3 error'));

      await expect(
        sensorDataService.deleteSensorData(user, sensorDataIdSchema.parse(sensorDataRecord.id)),
      ).rejects.toThrow(InternalServerErrorException);
      expect(vi.spyOn(dbMock, 'delete')).toHaveBeenCalled();
      expect(vi.spyOn(s3Service, 'deleteObject')).toHaveBeenCalled();
    });
  });

  describe('getSensorDataPresignedUrl', () => {
    it('センサーデータのpresigned URLを取得できる', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData();
      const presignedUrl = 'https://example.com/presigned-url';

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(s3Service, 'getPresignedUrl').mockResolvedValue(presignedUrl);

      const result = await sensorDataService.getSensorDataPresignedUrl(
        user,
        sensorDataIdSchema.parse(sensorDataRecord.id),
      );
      expect(result).toStrictEqual({
        id: sensorDataIdSchema.parse(sensorDataRecord.id),
        dataName: sensorDataNameSchema.parse(sensorDataRecord.dataName),
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        activeSensors: sensorDataRecord.activeSensors,
        urls: sensorDataRecord.activeSensors.map((sensor) => ({
          sensor,
          presignedUrl,
        })),
      } satisfies GetSensorDataPresignedUrlResponse);
    });

    it('センサーデータが存在しない場合、エラーをスローする', async () => {
      const user = createUser();
      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(undefined);

      await expect(
        sensorDataService.getSensorDataPresignedUrl(user, sensorDataIdSchema.parse('non-exist-id')),
      ).rejects.toThrow(NotFoundException);
    });

    it('presigned URLの取得に失敗した場合、エラーをスローする', async () => {
      const user = createUser();
      const sensorDataRecord = createSensorData();

      vi.spyOn(dbMock.query.SensorDataSchema, 'findFirst').mockResolvedValue(sensorDataRecord);
      vi.spyOn(s3Service, 'getPresignedUrl').mockRejectedValue(new Error('S3 error'));

      await expect(
        sensorDataService.getSensorDataPresignedUrl(user, sensorDataIdSchema.parse(sensorDataRecord.id)),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
