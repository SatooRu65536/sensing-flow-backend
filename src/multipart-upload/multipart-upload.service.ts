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
  CompleteMultipartUploadResponse,
} from './multipart-upload.dto';
import type { DbType } from '@/database/database.module';
import { S3Service } from '@/s3/s3.service';
import { and, desc, eq } from 'drizzle-orm';
import { SensorDataSchema, MultipartUploadSchema } from '@/_schema';
import { v4 } from 'uuid';
import { MultipartUploadStatusEnum } from './multipart-upload.model';
import { ErrorCodeEnum, handleDrizzleError } from '@/common/utils/drizzle-error';
import { User } from '@/users/users.dto';

@Injectable()
export class MultipartUploadService {
  constructor(
    @Inject('DRIZZLE_DB') private readonly db: DbType,
    private readonly s3Service: S3Service,
  ) {}

  async listMultipartUploads(user: User): Promise<ListMultipartUploadResponse> {
    const multipartUploadRecords = await this.db.query.MultipartUploadSchema.findMany({
      where: and(
        eq(MultipartUploadSchema.userId, user.id),
        eq(MultipartUploadSchema.status, MultipartUploadStatusEnum.IN_PROGRESS),
      ),
      orderBy: desc(MultipartUploadSchema.createdAt),
    });

    const multipartUploads: MultiPartUpload[] = multipartUploadRecords.map((record) => ({
      uploadId: record.id,
      dataName: record.dataName,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    return { multipartUploads };
  }

  async startMultipartUpload(user: User, body: StartMultipartUploadRequest): Promise<StartMultipartUploadResponse> {
    const uploadId = v4();

    const multipartUploadKey = this.s3Service.getMultipartUploadKey(user.id, uploadId);

    try {
      const uploadResponse = await this.s3Service.createMultipartUpload(multipartUploadKey);

      if (uploadResponse.UploadId == null) {
        throw new InternalServerErrorException('Failed to create multipart upload');
      }

      const multipartUploadRecords = await this.db
        .insert(MultipartUploadSchema)
        .values({
          id: uploadId,
          s3uploadId: uploadResponse.UploadId,
          userId: user.id,
          dataName: body.dataName,
          status: MultipartUploadStatusEnum.IN_PROGRESS,
        })
        .$returningId();

      if (multipartUploadRecords.length === 0) {
        throw new InternalServerErrorException('Failed to create multipart upload');
      }

      const multipartUploadRecord = multipartUploadRecords[0];

      return { dataName: body.dataName, uploadId: multipartUploadRecord.id };
    } catch (e) {
      const error = handleDrizzleError(e);
      switch (error.code) {
        case ErrorCodeEnum.DUPLICATE_ENTRY:
          throw new BadRequestException('既に存在するアップロードIDです');
        default:
          console.error(error.cause);
          throw new InternalServerErrorException('Failed to create multipart upload');
      }
    }
  }

  async uploadMultipartUpload(user: User, uploadId: string, body: string): Promise<PostMultipartUploadResponse> {
    const multipartUploadRecord = await this.db.query.MultipartUploadSchema.findFirst({
      where: and(eq(MultipartUploadSchema.id, uploadId), eq(MultipartUploadSchema.userId, user.id)),
    });

    if (multipartUploadRecord == undefined) {
      throw new NotFoundException('Multipart upload not found');
    }

    if (multipartUploadRecord.status !== MultipartUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot abort a completed or aborted upload');
    }

    const lastNumber = multipartUploadRecord.parts.reduce(
      (prev, curr) => (curr.partNumber > prev ? curr.partNumber : prev),
      0,
    );
    const partNumber = lastNumber + 1;

    const multipartUploadKey = this.s3Service.getMultipartUploadKey(
      multipartUploadRecord.userId,
      multipartUploadRecord.id,
    );

    try {
      const multupartUploadRes = await this.s3Service.postMultipartUpload(
        multipartUploadKey,
        multipartUploadRecord.s3uploadId,
        partNumber,
        body,
      );

      const etag = multupartUploadRes.ETag;
      if (etag == null) {
        throw new InternalServerErrorException('Failed to upload part: ETag is null');
      }

      await this.db.transaction(async (tx) => {
        // トランザクション内で再取得してロックをかける
        const record = await tx.query.MultipartUploadSchema.findFirst({
          where: eq(MultipartUploadSchema.id, multipartUploadRecord.id),
        });

        if (record == undefined) {
          throw new NotFoundException('Sensor upload not found');
        }

        await tx
          .update(MultipartUploadSchema)
          .set({
            parts: [...multipartUploadRecord.parts, { partNumber, etag }],
          })
          .where(eq(MultipartUploadSchema.id, multipartUploadRecord.id));
      });
    } catch (e) {
      console.error(e);
      if (e instanceof NotFoundException) {
        // transaction 内で NotFoundException が投げられた場合はそのまま投げ直す
        throw e;
      }
      throw new InternalServerErrorException('Failed to upload part');
    }

    return {
      uploadId: multipartUploadRecord.id,
      dataName: multipartUploadRecord.dataName,
    };
  }

  async completeMultipartUpload(user: User, uploadId: string): Promise<CompleteMultipartUploadResponse> {
    const multipartUploadRecord = await this.db.query.MultipartUploadSchema.findFirst({
      where: and(eq(MultipartUploadSchema.id, uploadId), eq(MultipartUploadSchema.userId, user.id)),
    });

    if (multipartUploadRecord == undefined) {
      throw new NotFoundException('Sensor upload not found');
    }

    if (multipartUploadRecord.status !== MultipartUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot complete a completed or aborted upload');
    }

    const multipartUploadKey = this.s3Service.getMultipartUploadKey(
      multipartUploadRecord.userId,
      multipartUploadRecord.id,
    );

    try {
      await this.db.transaction(async (tx) => {
        await Promise.all([
          tx
            .update(MultipartUploadSchema)
            .set({ status: MultipartUploadStatusEnum.COMPLETED })
            .where(eq(MultipartUploadSchema.id, uploadId)),
          tx.insert(SensorDataSchema).values({
            userId: user.id,
            s3key: multipartUploadKey,
            dataName: multipartUploadRecord.dataName,
          }),
        ]);

        try {
          await this.s3Service.completeMultipartUpload(
            multipartUploadKey,
            multipartUploadRecord.s3uploadId,
            multipartUploadRecord.parts,
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
      uploadId: multipartUploadRecord.id,
      dataName: multipartUploadRecord.dataName,
    };
  }

  async abortMultipartUpload(user: User, uploadId: string): Promise<AbortMultipartUploadResponse> {
    const multipartUploadRecord = await this.db.query.MultipartUploadSchema.findFirst({
      where: and(eq(MultipartUploadSchema.id, uploadId), eq(MultipartUploadSchema.userId, user.id)),
    });

    if (multipartUploadRecord == undefined) {
      throw new NotFoundException('Sensor upload not found');
    }

    if (multipartUploadRecord.status !== MultipartUploadStatusEnum.IN_PROGRESS) {
      throw new BadRequestException('Cannot abort a completed or aborted upload');
    }

    try {
      const multipartUploadKey = this.s3Service.getMultipartUploadKey(
        multipartUploadRecord.userId,
        multipartUploadRecord.id,
      );
      await this.s3Service.abortMultipartUpload(multipartUploadKey, multipartUploadRecord.s3uploadId);
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to abort multipart upload', { cause: e });
    }

    try {
      await this.db
        .update(MultipartUploadSchema)
        .set({ status: MultipartUploadStatusEnum.ABORTED })
        .where(eq(MultipartUploadSchema.id, uploadId));
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Failed to update sensor upload status', { cause: e });
    }

    return {
      uploadId: multipartUploadRecord.id,
      dataName: multipartUploadRecord.dataName,
    };
  }
}
