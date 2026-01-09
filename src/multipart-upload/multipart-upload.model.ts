import { MultipartUploadSchema } from '@/_schema';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const multipartUploadInsertZodSchema = createInsertSchema(MultipartUploadSchema);
export type MultipartUploadInsertT = z.infer<typeof multipartUploadInsertZodSchema>;

export const multipartUploadSelectZodSchema = createSelectSchema(MultipartUploadSchema);
export type MultipartUploadRecordT = z.infer<typeof multipartUploadSelectZodSchema>;

export const multipartUploadStatusEnumSchema = multipartUploadSelectZodSchema.shape.status;
export const multipartUploadStatusOptions = multipartUploadStatusEnumSchema.options;
export type MultipartUploadStatusEnum = z.infer<typeof multipartUploadStatusEnumSchema>;

export const MultipartUploadStatusEnum = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABORTED: 'aborted',
} as const satisfies Record<string, MultipartUploadStatusEnum>;

export type MultipartUploadParts = z.infer<typeof multipartUploadSelectZodSchema.shape.parts>;
