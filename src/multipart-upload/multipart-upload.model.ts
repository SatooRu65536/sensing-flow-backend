import { MultipartUploadSchema } from '@/_schema';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const sensorUploadInsertZodSchema = createInsertSchema(MultipartUploadSchema);
export type SensorUploadInsertT = z.infer<typeof sensorUploadInsertZodSchema>;

export const sensorUploadSelectZodSchema = createSelectSchema(MultipartUploadSchema);
export type SensorUploadRecordT = z.infer<typeof sensorUploadSelectZodSchema>;

export const sensorUploadStatusEnumSchema = sensorUploadSelectZodSchema.shape.status;
export const sensorUploadStatusOptions = sensorUploadStatusEnumSchema.options;
export type SensorUploadStatusEnum = z.infer<typeof sensorUploadStatusEnumSchema>;

export const SensorUploadStatusEnum = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABORTED: 'aborted',
} as const satisfies Record<string, SensorUploadStatusEnum>;

export type SensorUploadParts = z.infer<typeof sensorUploadSelectZodSchema.shape.parts>;
