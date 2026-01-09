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
import { PutObjectCommandOutput } from '@aws-sdk/client-s3';

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
      expect(vi.spyOn(dbMock, 'rollback')).toHaveBeenCalled(); // insert がロールバックされていることを確認
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
