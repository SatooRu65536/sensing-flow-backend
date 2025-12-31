import { Inject, Injectable } from '@nestjs/common';
import { ListSensorDataResponse, SensorData } from './sensor-data.dto';
import { UsersService } from '@/users/users.service';
import type { DbType } from '@/database/database.module';
import { UserPayload } from '@/auth/jwt.schema';
import { desc, eq } from 'drizzle-orm';
import { SensorDataSchema } from '@/_schema';

@Injectable()
export class SensorDataService {
  constructor(
    @Inject('DRIZZLE_DB') private db: DbType,
    private readonly usersService: UsersService,
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
}
