/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(["list:sensor_data","upload:sensor_data","start:multipart_upload","list:multipart_upload","upload:multipart_upload","complete:multipart_upload","abort:multipart_upload","test:rate_limit"]);
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
