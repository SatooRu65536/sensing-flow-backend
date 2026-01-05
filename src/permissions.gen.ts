/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(["list:multipart_upload","post:multipart_upload","abort:multipart_upload","list:sensor_data"]);
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
