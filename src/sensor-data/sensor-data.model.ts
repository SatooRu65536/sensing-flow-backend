import { SensorDataSchema } from '@/_schema';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const sensorDataZodSchema = createSelectSchema(SensorDataSchema);
export type SensorDataRecord = z.infer<typeof sensorDataZodSchema>;
