import { UserPayload } from '@/auth/jwt.schema';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AbortUploadSensorDataResponse,
  StartUploadSensorDataRequest,
  StartUploadSensorDataResponse,
} from './sensor-upload.dto';
import type { DbType } from '@/database/database.module';
import { S3Service } from '@/s3/s3.service';
import { eq } from 'drizzle-orm';
import { SensorUploadSchema, UserSchema } from '@/_schema';
import { v4 } from 'uuid';
import { SensorUploadStatusEnum } from './sensor-upload.model';
import { ErrorCodeEnum, handleDrizzleError } from '@/utils/drizzle-error';

@Injectable()
export class SensorUploadService {
  constructor(
    @Inject('DRIZZLE_DB') private readonly db: DbType,
    private readonly s3Service: S3Service,
  ) {}

  async startUploadSensorData(
    user: UserPayload,
    body: StartUploadSensorDataRequest,
  ): Promise<StartUploadSensorDataResponse> {
    const userRecord = await this.db.query.UserSchema.findFirst({ where: eq(UserSchema.sub, user.sub) });

    if (userRecord == null) {
      throw new NotFoundException('User not found');
    }

    const uploadId = v4();

    const sensorUploadKey = this.s3Service.getSensorUploadKey(userRecord.id, uploadId);
    const uploadResponse = await this.s3Service.createMultipartUpload(sensorUploadKey);

    if (uploadResponse.UploadId == null) {
      throw new InternalServerErrorException('Failed to create multipart upload');
    }

    try {
      const sensorUploadRecords = await this.db
        .insert(SensorUploadSchema)
        .values({
          id: uploadId,
          s3uploadId: uploadResponse.UploadId,
          userId: userRecord.id,
          dataName: body.dataName,
          parts: [],
          status: SensorUploadStatusEnum.IN_PROGRESS,
        })
        .$returningId();

      if (sensorUploadRecords.length === 0) {
        throw new InternalServerErrorException('Failed to create sensor upload record');
      }

      const sensorUploadRecord = sensorUploadRecords[0];

      return { dataName: body.dataName, uploadId: sensorUploadRecord.id };
    } catch (e) {
      const error = handleDrizzleError(e);
      switch (error.code) {
        case ErrorCodeEnum.DUPLICATE_ENTRY:
          throw new BadRequestException('既に存在するアップロードIDです', { cause: error });
        default:
          throw new InternalServerErrorException('Failed to create sensor upload record', { cause: error });
      }
    }
  }

  async abortUploadSensorData(user: UserPayload, uploadId: string): Promise<AbortUploadSensorDataResponse> {
    const records = await this.db
      .select()
      .from(SensorUploadSchema)
      .where(eq(SensorUploadSchema.id, uploadId))
      .innerJoin(UserSchema, eq(SensorUploadSchema.userId, UserSchema.id));

    if (records.length === 0) {
      throw new NotFoundException('Sensor upload not found');
    }

    const record = records[0];

    if (record.users.sub !== user.sub) {
      throw new BadRequestException('You do not have permission to abort this upload');
    }

    if (record.sensor_uploads.status !== SensorUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot abort a completed or aborted upload');
    }

    try {
      await this.s3Service.abortMultipartUpload(
        this.s3Service.getSensorUploadKey(record.users.id, record.sensor_uploads.id),
        record.sensor_uploads.s3uploadId,
      );
    } catch (e) {
      throw new InternalServerErrorException('Failed to abort multipart upload', { cause: e });
    }

    await this.db
      .update(SensorUploadSchema)
      .set({ status: SensorUploadStatusEnum.ABORTED })
      .where(eq(SensorUploadSchema.id, uploadId));

    return {
      uploadId: record.sensor_uploads.id,
      dataName: record.sensor_uploads.dataName,
      createdAt: record.sensor_uploads.createdAt,
    };
  }
}
