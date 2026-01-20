import type { DbType } from '@/database/database.module';
import { S3Service } from '@/s3/s3.service';
import { User } from '@/users/users.dto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UploadSensorDataRequest, UploadSensorDataResponse } from './sensor-data.dto';
import { v4 } from 'uuid';
import pLimit from 'p-limit';
import { sensorDataIdSchema } from '@/types/brand';
import { SensorsEnum, sensorsEnumSchema } from './sensor-data.schema';
import { eq } from 'drizzle-orm';
import { SensorDataSchema } from '@/_schema';
import {
  UploadStatus,
  UploadStatusAlreadyUploaded,
  UploadStatusInvalidType,
  UploadStatusSuccess,
} from './sensor-data.type';

const limit = pLimit(5);

@Injectable()
export class SensorDataService {
  constructor(
    @Inject('DRIZZLE_DB') private db: DbType,
    private readonly s3Service: S3Service,
  ) {}

  async uploadSensorDataFiles(
    user: User,
    body: UploadSensorDataRequest,
    files: Express.Multer.File[],
  ): Promise<UploadSensorDataResponse> {
    const sensorDataId = body.id ?? sensorDataIdSchema.parse(v4());
    const folderS3key = this.s3Service.generateFolderS3Key(user.id, sensorDataId);

    const results: UploadStatus[] = await Promise.all(
      files.map((file) =>
        limit(async () => {
          const sensorResult = sensorsEnumSchema.safeParse(file.originalname);
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
              // 既にアップロード済みのセンサーデータ
              if (sensorDataRecord.activeSensors.includes(sensorData)) {
                tx.rollback();
                return {
                  success: false,
                  sensor: sensorData,
                  fileS3Key: fileS3key,
                  reason: 'Sensor data already uploaded',
                } satisfies UploadStatusAlreadyUploaded;
              }
              // アクティブセンサを追加
              await tx
                .update(SensorDataSchema)
                .set({ activeSensors: [...sensorDataRecord.activeSensors, sensorData], dataName: body.dataName })
                .where(eq(SensorDataSchema.id, sensorDataId));
            }

            try {
              await this.s3Service.putObject(fileS3key, file.buffer);
            } catch (error) {
              tx.rollback();
              throw error;
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

    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: eq(SensorDataSchema.id, sensorDataId),
    });

    const uploadedSensors: SensorsEnum[] = results.filter((r) => r.success).map((r) => r.sensor);
    const failedSensors: string[] = results.filter((r) => !r.success).map((r) => r.sensor);

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
}
