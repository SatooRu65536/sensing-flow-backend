import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  GetSensorDataPresignedUrlResponse,
  GetSensorDataResponse,
  ListSensorDataResponse,
  SensorData,
  UpdateSensorDataResponse,
  UploadSensorDataRequest,
  UploadSensorDataResponse,
} from './sensor-data.dto';
import type { DbType } from '@/database/database.module';
import { and, desc, eq } from 'drizzle-orm';
import { SensorDataSchema } from '@/_schema';
import { S3Service } from '@/s3/s3.service';
import { User } from '@/users/users.dto';
import { v4 } from 'uuid';
import { handleDrizzleError } from '@/common/utils/drizzle-error';
import { ErrorCodeEnum } from '@/common/errors/custom-drizzle.error';

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
    }));

    return { sensorData };
  }

  async uploadSensorDataFile(
    user: User,
    body: UploadSensorDataRequest,
    file: Express.Multer.File,
  ): Promise<UploadSensorDataResponse> {
    const uploadId = v4();
    const s3key = this.s3Service.getUploadS3Key(user.id, uploadId);

    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(SensorDataSchema).values({
          id: uploadId,
          userId: user.id,
          dataName: body.dataName,
          s3key,
        });
        try {
          await this.s3Service.putObject(s3key, file.buffer);
        } catch (e) {
          tx.rollback();
          throw e;
        }
      });
    } catch (e) {
      console.error(e);
      const error = handleDrizzleError(e);
      switch (error.code) {
        case ErrorCodeEnum.DUPLICATE_ENTRY:
          throw new InternalServerErrorException('Already existing upload ID');
        default:
          throw new InternalServerErrorException('Failed to save sensor data metadata');
      }
    }

    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: eq(SensorDataSchema.id, uploadId),
    });

    if (sensorDataRecord == undefined) {
      throw new InternalServerErrorException('Failed to retrieve saved sensor data');
    }

    return {
      id: sensorDataRecord.id,
      dataName: sensorDataRecord.dataName,
      createdAt: sensorDataRecord.createdAt,
      updatedAt: sensorDataRecord.updatedAt,
    };
  }

  async getSensorData(user: User, id: string): Promise<GetSensorDataResponse> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    return {
      id: sensorDataRecord.id,
      dataName: sensorDataRecord.dataName,
      createdAt: sensorDataRecord.createdAt,
      updatedAt: sensorDataRecord.updatedAt,
    };
  }

  async updateSensorData(user: User, id: string, body: { dataName: string }): Promise<UpdateSensorDataResponse> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    await this.db
      .update(SensorDataSchema)
      .set({ dataName: body.dataName })
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
      createdAt: updatedRecord.createdAt,
      updatedAt: updatedRecord.updatedAt,
    };
  }

  async deleteSensorData(user: User, id: string): Promise<void> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    try {
      await this.db.transaction(async (tx) => {
        await tx.delete(SensorDataSchema).where(and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)));
        try {
          await this.s3Service.deleteObject(sensorDataRecord.s3key);
        } catch (e) {
          tx.rollback();
          throw e;
        }
      });
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to delete sensor data');
    }
  }

  async getSensorDataPresignedUrl(user: User, id: string): Promise<GetSensorDataPresignedUrlResponse> {
    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, user.id)),
    });

    if (sensorDataRecord == undefined) {
      throw new NotFoundException('Sensor data not found');
    }

    try {
      const presignedUrl = await this.s3Service.getPresignedUrl(
        sensorDataRecord.s3key,
        `${sensorDataRecord.dataName}.csv`,
      );

      return {
        id: sensorDataRecord.id,
        dataName: sensorDataRecord.dataName,
        createdAt: sensorDataRecord.createdAt,
        updatedAt: sensorDataRecord.updatedAt,
        presignedUrl,
      };
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to get presigned URL');
    }
  }
}
