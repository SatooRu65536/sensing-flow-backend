/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(["read:health","list:sensor_upload","post:sensor_upload","abort:sensor_upload","list:sensor_data"]);
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
