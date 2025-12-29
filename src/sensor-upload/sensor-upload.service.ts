import { UserPayload } from '@/auth/jwt.schema';
import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { StartUploadSensorDataRequest, StartUploadSensorDataResponse } from './sensor-upload.dto';
import type { DbType } from '@/database/database.module';
import { S3Service } from '@/s3/s3.service';
import { eq } from 'drizzle-orm';
import { SensorUploadSchema, UserSchema } from '@/_schema';
import { v4 } from 'uuid';
import { SensorUploadStatusEnum } from './sensor-upload.model';

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
          uploadId: uploadResponse.UploadId,
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
    } catch (error) {
      console.error('Error creating sensor upload record:', error);
      throw new InternalServerErrorException('Failed to create sensor upload record');
    }
  }
}
