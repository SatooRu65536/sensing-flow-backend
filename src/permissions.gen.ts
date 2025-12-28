/* eslint-disable prettier/prettier */
import z from 'zod';

export const permissionEnumSchema = z.enum(["read:health"]);
export type PermissionEnum = z.infer<typeof permissionEnumSchema>;
