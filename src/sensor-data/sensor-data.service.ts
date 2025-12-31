import { Inject, Injectable } from '@nestjs/common';
import { GetSensorDataPresignedUrlResponse, ListSensorDataResponse, SensorData } from './sensor-data.dto';
import { UsersService } from '@/users/users.service';
import type { DbType } from '@/database/database.module';
import { UserPayload } from '@/auth/jwt.schema';
import { and, desc, eq } from 'drizzle-orm';
import { SensorDataSchema } from '@/_schema';
import { S3Service } from '@/s3/s3.service';

@Injectable()
export class SensorDataService {
  constructor(
    @Inject('DRIZZLE_DB') private db: DbType,
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
  ) {}

  async listSensorData(user: UserPayload, page: number, perPage: number): Promise<ListSensorDataResponse> {
    const userRecord = await this.usersService.getUserBySub(user.sub);

    const sensorDataRecords = await this.db.query.SensorDataSchema.findMany({
      where: eq(SensorDataSchema.userId, userRecord.id),
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

  async getSensorDataPresignedUrl(user: UserPayload, id: string): Promise<GetSensorDataPresignedUrlResponse> {
    const userRecord = await this.usersService.getUserBySub(user.sub);

    const sensorDataRecord = await this.db.query.SensorDataSchema.findFirst({
      where: and(eq(SensorDataSchema.id, id), eq(SensorDataSchema.userId, userRecord.id)),
    });

    if (sensorDataRecord == null) {
      throw new Error('Sensor data not found');
    }

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
  }
}
