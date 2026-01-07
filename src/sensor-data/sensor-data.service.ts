import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GetSensorDataPresignedUrlResponse, ListSensorDataResponse, SensorData } from './sensor-data.dto';
import type { DbType } from '@/database/database.module';
import { and, desc, eq } from 'drizzle-orm';
import { SensorDataSchema } from '@/_schema';
import { S3Service } from '@/s3/s3.service';
import { User } from '@/users/users.dto';

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
