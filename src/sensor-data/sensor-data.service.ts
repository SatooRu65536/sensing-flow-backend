import type { DbType } from '@/database/database.module';
import { S3Service } from '@/s3/s3.service';
import { User } from '@/users/users.dto';
import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  GetSensorDataPresignedUrlResponse,
  GetSensorDataResponse,
  ListSensorDataResponse,
  PresignedUrl,
  SensorData,
  UpdateSensorDataRequest,
  UpdateSensorDataResponse,
  UploadSensorDataRequest,
  UploadSensorDataResponse,
} from './sensor-data.dto';
import { v4 } from 'uuid';
import pLimit from 'p-limit';
import { SensorDataId, sensorDataIdSchema } from '@/types/brand';
import { SensorsEnum, sensorsEnumSchema } from './sensor-data.schema';
import { and, desc, eq } from 'drizzle-orm';
import { SensorDataSchema } from '@/_schema';
import {
  UploadStatus,
  UploadStatusInvalidType,
  UploadStatusSuccess,
  UploadStatusUploadFailed,
} from './sensor-data.type';
import path from 'path';

const limit = pLimit(5);

@Injectable()
export class SensorDataService {
  constructor(
    @Inject('DRIZZLE_DB') private db: DbType,
    private readonly s3Service: S3Service,
  ) {}

  async listSensorData(user: User, page: number, perPage: number): Promise<ListSensorDataResponse> {
    const sensorDataRecords = await this.db.query.SensorDataSchema.findMany({
      where: eq(SensorDataSchema.userId, user.id),
      limit: perPage,
      offset: (page - 1) * perPage,
      orderBy: desc(SensorDataSchema.createdAt),
    });

    const sensorData: SensorData[] = sensorDataRecords.map((r) => ({
      id: r.id,
      dataName: r.dataName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      activeSensors: r.activeSensors,
    }));

    return { sensorData };
  }

  async uploadSensorDataFiles(
    user: User,
    body: UploadSensorDataRequest,
    files: Express.Multer.File[],
  ): Promise<UploadSensorDataResponse> {
    if (body.id) {
      const existingRecord = await this.db.query.SensorDataSchema.findFirst({
        where: eq(SensorDataSchema.id, body.id),
      });
      if (existingRecord == undefined) {
        throw new NotFoundException('Sensor data record not found');
      }
    }

    const sensorDataId = body.id ?? sensorDataIdSchema.parse(v4());
    const folderS3key = this.s3Service.generateFolderS3Key(user.id, sensorDataId);

    const results: UploadStatus[] = await Promise.all(
      files.map((file) =>
        limit(async () => {
          const sensorResult = sensorsEnumSchema.safeParse(path.parse(file.originalname).name);
          if (!sensorResult.success) {
            return {
              success: false,
              sensor: file.originalname,
              fileS3Key: null,
              reason: 'Invalid sensor type',
            } satisfies UploadStatusInvalidType;
          }

          const sensorData = sensorResult.data;
          const fileS3key = this.s3Service.folderToFileS3Key(folderS3key, sensorData);

          return await this.db.transaction(async (tx) => {
            const sensorDataRecord = await tx.query.SensorDataSchema.findFirst({
              where: eq(SensorDataSchema.id, sensorDataId),
              columns: { activeSensors: true },
            });

            if (sensorDataRecord == undefined) {
              // 新規作成
              await tx.insert(SensorDataSchema).values({
                id: sensorDataId,
                userId: user.id,
                dataName: body.dataName,
                folderS3Key: folderS3key,
                activeSensors: [sensorData],
                createdAt: body.createdAt,
              });
            } else {
              // 既にアップロード済みのセンサーデータの場合はスキップ
              if (!sensorDataRecord.activeSensors.includes(sensorData)) {
                await tx
                  .update(SensorDataSchema)
                  .set({ activeSensors: [...sensorDataRecord.activeSensors, sensorData], dataName: body.dataName })
                  .where(eq(SensorDataSchema.id, sensorDataId));
              }
            }

            try {
              // S3にアップロード(作成・上書き)
              await this.s3Service.putObject(fileS3key, file.buffer);
            } catch (e) {
              console.error(e);
              tx.rollback();
              return {
                success: false,
                sensor: sensorData,
                fileS3Key: fileS3key,
                reason: 'Upload failed',
              } satisfies UploadStatusUploadFailed;
            }

            return {
              success: true,
              sensor: sensorData,
              fileS3Key: fileS3key,
            } satisfies UploadStatusSuccess;
          });
        }),
      ),
    );

    const uploadedSensors: SensorsEnum[] = results.filter((r) => r.success).map((r) => r.sensor);
    const failedSensors: string[] = results.filter((r) => !r.success).map((r) => r.sensor);

    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: eq(SensorDataSchema.id, sensorDataId),
    });
    if (sensorDataRecord == undefined) throw new NotFoundException('Sensor data record not found after upload');

    return {
      id: sensorDataRecord.id,
      dataName: sensorDataRecord.dataName,
      uploadedSensors,
      failedSensors,
      createdAt: sensorDataRecord.createdAt,
      updatedAt: sensorDataRecord.updatedAt,
    };
  }

  async getSensorData(user: User, id: SensorDataId): Promise<GetSensorDataResponse> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    return {
      id: sensorDataRecord.id,
      dataName: sensorDataRecord.dataName,
      activeSensors: sensorDataRecord.activeSensors,
      createdAt: sensorDataRecord.createdAt,
      updatedAt: sensorDataRecord.updatedAt,
    };
  }

  async updateSensorData(
    user: User,
    id: SensorDataId,
    body: UpdateSensorDataRequest,
  ): Promise<UpdateSensorDataResponse> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    await this.db
      .update(SensorDataSchema)
      .set(body)
      .where(and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)));

    const updatedRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (updatedRecord == undefined) {
      throw new InternalServerErrorException('Failed to retrieve updated sensor data');
    }

    return {
      id: updatedRecord.id,
      dataName: updatedRecord.dataName,
      activeSensors: updatedRecord.activeSensors,
      createdAt: updatedRecord.createdAt,
      updatedAt: updatedRecord.updatedAt,
    };
  }

  async deleteSensorData(user: User, id: SensorDataId): Promise<void> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    try {
      await this.db
        .delete(SensorDataSchema)
        .where(and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)));

      await Promise.all(
        sensorDataRecord.activeSensors.map((sensor) => {
          const fileS3Key = this.s3Service.folderToFileS3Key(sensorDataRecord.folderS3Key, sensor);
          return this.s3Service.deleteObject(fileS3Key);
        }),
      );
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to delete sensor data');
    }
  }

  async getSensorDataPresignedUrl(user: User, id: SensorDataId): Promise<GetSensorDataPresignedUrlResponse> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    try {
      const presignedUrls: PresignedUrl[] = await Promise.all(
        sensorDataRecord.activeSensors.map(async (sensor) => {
          const fileS3Key = this.s3Service.folderToFileS3Key(sensorDataRecord.folderS3Key, sensor);
          const url = await this.s3Service.getPresignedUrl(fileS3Key, sensor);
          return {
            sensor,
            presignedUrl: url,
          };
        }),
      );

      return {
        id: sensorDataRecord.id,
        dataName: sensorDataRecord.dataName,
        activeSensors: sensorDataRecord.activeSensors,
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        presignedUrls,
      };
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to get presigned URL');
    }
  }
}
