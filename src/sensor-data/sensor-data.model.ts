import { SensorDataSchema } from '@/_schema';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const sensorDataInsertZodSchema = createInsertSchema(SensorDataSchema);
export type SensorDataInsertT = z.infer<typeof sensorDataInsertZodSchema>;

export const sensorDataSelectZodSchema = createSelectSchema(SensorDataSchema);
export type SensorDataRecordT = z.infer<typeof sensorDataSelectZodSchema>;
