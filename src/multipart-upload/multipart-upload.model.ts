import { SensorUploadSchema } from '@/_schema';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

const sensorUploadZodSchema = createSelectSchema(SensorUploadSchema);
export type SensorUploadRecordT = z.infer<typeof sensorUploadZodSchema>;

export const sensorUploadStatusEnumSchema = sensorUploadZodSchema.shape.status;
export type SensorUploadStatusEnum = z.infer<typeof sensorUploadStatusEnumSchema>;

export const SensorUploadStatusEnum = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABORTED: 'aborted',
} as const satisfies Record<string, SensorUploadStatusEnum>;

export type SensorUploadParts = z.infer<typeof sensorUploadZodSchema.shape.parts>;
