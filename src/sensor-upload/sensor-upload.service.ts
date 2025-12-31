import { UserPayload } from '@/auth/jwt.schema';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  SensorUpload,
  AbortUploadSensorDataResponse,
  ListUploadSensorDataResponse,
  StartUploadSensorDataRequest,
  StartUploadSensorDataResponse,
  PostUploadSensorDataResponse,
} from './sensor-upload.dto';
import type { DbType } from '@/database/database.module';
import { S3Service } from '@/s3/s3.service';
import { and, desc, eq } from 'drizzle-orm';
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

  async listSensorUploads(user: UserPayload): Promise<ListUploadSensorDataResponse> {
    const userRecord = await this.db.query.UserSchema.findFirst({ where: eq(UserSchema.sub, user.sub) });

    if (userRecord == null) {
      throw new NotFoundException('User not found');
    }

    const sensorUploadRecords = await this.db.query.SensorUploadSchema.findMany({
      where: and(
        eq(SensorUploadSchema.userId, userRecord.id),
        eq(SensorUploadSchema.status, SensorUploadStatusEnum.IN_PROGRESS),
      ),
      orderBy: desc(SensorUploadSchema.createdAt),
    });

    const sensorUploads: SensorUpload[] = sensorUploadRecords.map((record) => ({
      uploadId: record.id,
      dataName: record.dataName,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    return { sensorUploads };
  }

  async startSensorUpload(
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
          console.error(error.cause);
          throw new InternalServerErrorException('Failed to create sensor upload record', { cause: error });
      }
    }
  }

  async postUploadSensorData(user: UserPayload, uploadId: string, body: string): Promise<PostUploadSensorDataResponse> {
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

    const lastNumber = record.sensor_uploads.parts.reduce(
      (prev, curr) => (curr.partNumber > prev ? curr.partNumber : prev),
      0,
    );
    const partNumber = lastNumber + 1;

    const sensorUploadKey = this.s3Service.getSensorUploadKey(record.users.id, record.sensor_uploads.id);

    try {
      const multupartUploadRes = await this.s3Service.postMultipartUpload(
        sensorUploadKey,
        record.sensor_uploads.s3uploadId,
        partNumber,
        body,
      );

      const etag = multupartUploadRes.ETag;
      if (etag == null) {
        throw new InternalServerErrorException('Failed to upload part: ETag is null');
      }

      await this.db.transaction(async (tx) => {
        const sensorUploadRecord = await tx.query.SensorUploadSchema.findFirst({
          where: eq(SensorUploadSchema.id, record.sensor_uploads.id),
        });

        if (sensorUploadRecord == null) {
          throw new NotFoundException('Sensor upload not found in transaction');
        }

        await tx
          .update(SensorUploadSchema)
          .set({
            parts: [...sensorUploadRecord.parts, { partNumber, etag }],
          })
          .where(eq(SensorUploadSchema.id, sensorUploadRecord.id));
      });
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to upload part', { cause: e });
    }

    return {
      uploadId: record.sensor_uploads.id,
      dataName: record.sensor_uploads.dataName,
    };
  }

  async completeSensorUpload(user: UserPayload, uploadId: string): Promise<PostUploadSensorDataResponse> {
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
      throw new BadRequestException('You do not have permission to complete this upload');
    }

    if (record.sensor_uploads.status !== SensorUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot complete a completed or aborted upload');
    }

    const sensorUploadKey = this.s3Service.getSensorUploadKey(record.users.id, record.sensor_uploads.id);
    try {
      await this.s3Service.completeMultipartUpload(
        sensorUploadKey,
        record.sensor_uploads.s3uploadId,
        record.sensor_uploads.parts,
      );
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to complete multipart upload', { cause: e });
    }

    await this.db
      .update(SensorUploadSchema)
      .set({ status: SensorUploadStatusEnum.COMPLETED })
      .where(eq(SensorUploadSchema.id, uploadId));

    return {
      uploadId: record.sensor_uploads.id,
      dataName: record.sensor_uploads.dataName,
    };
  }

  async abortSensorUpload(user: UserPayload, uploadId: string): Promise<AbortUploadSensorDataResponse> {
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
      const sensorUploadKey = this.s3Service.getSensorUploadKey(record.users.id, record.sensor_uploads.id);
      await this.s3Service.abortMultipartUpload(sensorUploadKey, record.sensor_uploads.s3uploadId);
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to abort multipart upload', { cause: e });
    }

    await this.db
      .update(SensorUploadSchema)
      .set({ status: SensorUploadStatusEnum.ABORTED })
      .where(eq(SensorUploadSchema.id, uploadId));

    return {
      uploadId: record.sensor_uploads.id,
      dataName: record.sensor_uploads.dataName,
      status: SensorUploadStatusEnum.ABORTED,
      createdAt: record.sensor_uploads.createdAt,
      updatedAt: record.sensor_uploads.updatedAt,
    };
  }
}
