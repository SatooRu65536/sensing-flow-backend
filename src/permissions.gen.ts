/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(["read:health","post:sensor_uploads","abort:sensor_uploads"]);
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
