/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(["list:sensor_data","upload:sensor_data","list:multipart_upload","post:multipart_upload","abort:multipart_upload","test:rate_limit"]);
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
