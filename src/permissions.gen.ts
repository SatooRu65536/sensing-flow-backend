/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(["read:health","upload:sensor_data","abort:sensor_data"]);
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
