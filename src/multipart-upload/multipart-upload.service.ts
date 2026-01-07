import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  MultiPartUpload,
  ListMultipartUploadResponse,
  AbortMultipartUploadResponse,
  StartMultipartUploadRequest,
  StartMultipartUploadResponse,
  PostMultipartUploadResponse,
} from './multipart-upload.dto';
import type { DbType } from '@/database/database.module';
import { S3Service } from '@/s3/s3.service';
import { and, desc, eq } from 'drizzle-orm';
import { SensorDataSchema, SensorUploadSchema } from '@/_schema';
import { v4 } from 'uuid';
import { SensorUploadStatusEnum } from './multipart-upload.model';
import { ErrorCodeEnum, handleDrizzleError } from '@/utils/drizzle-error';
import { User } from '@/users/users.dto';

@Injectable()
export class MultipartUploadService {
  constructor(
    @Inject('DRIZZLE_DB') private readonly db: DbType,
    private readonly s3Service: S3Service,
  ) {}

  async listSensorUploads(user: User): Promise<ListMultipartUploadResponse> {
    const sensorUploadRecords = await this.db.query.SensorUploadSchema.findMany({
      where: and(
        eq(SensorUploadSchema.userId, user.id),
        eq(SensorUploadSchema.status, SensorUploadStatusEnum.IN_PROGRESS),
      ),
      orderBy: desc(SensorUploadSchema.createdAt),
    });

    const sensorUploads: MultiPartUpload[] = sensorUploadRecords.map((record) => ({
      uploadId: record.id,
      dataName: record.dataName,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    return { sensorUploads };
  }

  async startSensorUpload(user: User, body: StartMultipartUploadRequest): Promise<StartMultipartUploadResponse> {
    const uploadId = v4();

    const sensorUploadKey = this.s3Service.getSensorUploadKey(user.id, uploadId);

    try {
      const uploadResponse = await this.s3Service.createMultipartUpload(sensorUploadKey);

      if (uploadResponse.UploadId == null) {
        throw new InternalServerErrorException('Failed to create multipart upload');
      }

      const sensorUploadRecords = await this.db
        .insert(SensorUploadSchema)
        .values({
          id: uploadId,
          s3uploadId: uploadResponse.UploadId,
          userId: user.id,
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

  async postMultipartUpload(user: User, uploadId: string, body: string): Promise<PostMultipartUploadResponse> {
    const sensorUploadRecord = await this.db.query.SensorUploadSchema.findFirst({
      where: and(eq(SensorUploadSchema.id, uploadId), eq(SensorUploadSchema.userId, user.id)),
    });

    if (sensorUploadRecord?.userId !== user.id) {
      throw new NotFoundException('Sensor upload not found');
    }

    if (sensorUploadRecord.status !== SensorUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot abort a completed or aborted upload');
    }

    const lastNumber = sensorUploadRecord.parts.reduce(
      (prev, curr) => (curr.partNumber > prev ? curr.partNumber : prev),
      0,
    );
    const partNumber = lastNumber + 1;

    const sensorUploadKey = this.s3Service.getSensorUploadKey(sensorUploadRecord.userId, sensorUploadRecord.id);

    try {
      const multupartUploadRes = await this.s3Service.postMultipartUpload(
        sensorUploadKey,
        sensorUploadRecord.s3uploadId,
        partNumber,
        body,
      );

      const etag = multupartUploadRes.ETag;
      if (etag == null) {
        throw new InternalServerErrorException('Failed to upload part: ETag is null');
      }

      await this.db.transaction(async (tx) => {
        // トランザクション内で再取得してロックをかける
        const record = await tx.query.SensorUploadSchema.findFirst({
          where: eq(SensorUploadSchema.id, sensorUploadRecord.id),
        });

        if (record == undefined) {
          throw new NotFoundException('Sensor upload not found');
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
      if (e instanceof NotFoundException) {
        // transaction 内で NotFoundException が投げられた場合はそのまま投げ直す
        throw e;
      }
      throw new InternalServerErrorException('Failed to upload part', { cause: e });
    }

    return {
      uploadId: sensorUploadRecord.id,
      dataName: sensorUploadRecord.dataName,
    };
  }

  async completeSensorUpload(user: User, uploadId: string): Promise<PostMultipartUploadResponse> {
    const sensorUploadRecord = await this.db.query.SensorUploadSchema.findFirst({
      where: and(eq(SensorUploadSchema.id, uploadId), eq(SensorUploadSchema.userId, user.id)),
    });

    if (sensorUploadRecord == undefined) {
      throw new NotFoundException('Sensor upload not found');
    }

    if (sensorUploadRecord.status !== SensorUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot complete a completed or aborted upload');
    }

    const sensorUploadKey = this.s3Service.getSensorUploadKey(sensorUploadRecord.userId, sensorUploadRecord.id);

    try {
      await this.db.transaction(async (tx) => {
        await Promise.all([
          tx
            .update(SensorUploadSchema)
            .set({ status: SensorUploadStatusEnum.COMPLETED })
            .where(eq(SensorUploadSchema.id, uploadId)),
          tx.insert(SensorDataSchema).values({
            userId: user.id,
            s3key: sensorUploadKey,
            dataName: sensorUploadRecord.dataName,
          }),
        ]);

        try {
          await this.s3Service.completeMultipartUpload(
            sensorUploadKey,
            sensorUploadRecord.s3uploadId,
            sensorUploadRecord.parts,
          );
        } catch (e) {
          tx.rollback();
          throw new InternalServerErrorException('Failed to complete multipart upload', { cause: e });
        }
      });
    } catch (e) {
      console.error(e);
      // transaction 内での InternalServerErrorException 以外に注意
      throw new InternalServerErrorException('Failed to complete sensor upload');
    }

    return {
      uploadId: sensorUploadRecord.id,
      dataName: sensorUploadRecord.dataName,
    };
  }

  async abortSensorUpload(user: User, uploadId: string): Promise<AbortMultipartUploadResponse> {
    const sensorUploadRecord = await this.db.query.SensorUploadSchema.findFirst({
      where: and(eq(SensorUploadSchema.id, uploadId), eq(SensorUploadSchema.userId, user.id)),
    });

    if (sensorUploadRecord == undefined) {
      throw new NotFoundException('Sensor upload not found');
    }

    if (sensorUploadRecord.status !== SensorUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot abort a completed or aborted upload');
    }

    try {
      const sensorUploadKey = this.s3Service.getSensorUploadKey(sensorUploadRecord.userId, sensorUploadRecord.id);
      await this.s3Service.abortMultipartUpload(sensorUploadKey, sensorUploadRecord.s3uploadId);
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to abort multipart upload', { cause: e });
    }

    try {
      await this.db
        .update(SensorUploadSchema)
        .set({ status: SensorUploadStatusEnum.ABORTED })
        .where(eq(SensorUploadSchema.id, uploadId));
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to update sensor upload status', { cause: e });
    }

    return {
      uploadId: sensorUploadRecord.id,
      dataName: sensorUploadRecord.dataName,
      status: SensorUploadStatusEnum.ABORTED,
      createdAt: sensorUploadRecord.createdAt,
      updatedAt: sensorUploadRecord.updatedAt,
    };
  }
}
