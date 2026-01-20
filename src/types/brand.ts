import { z } from 'zod';

export const userIdSchema = z.string().brand<'UserId'>();
export type UserId = z.infer<typeof userIdSchema>;

export const userNameSchema = z.string().brand<'UserName'>();
export type UserName = string & z.BRAND<'UserName'>;

export const userSubSchema = z.string().brand<'UserSub'>();
export type UserSub = string & z.BRAND<'UserSub'>;

export const sensorDataIdSchema = z.string().brand<'SensorDataId'>();
export type SensorDataId = string & z.BRAND<'SensorDataId'>;

export const sensorDataNameSchema = z.string().brand<'SensorDataName'>();
export type SensorDataName = string & z.BRAND<'SensorDataName'>;

export const folderS3KeySchema = z.string().brand<'FolderS3Key'>();
export type FolderS3Key = string & z.BRAND<'FolderS3Key'>;

export const fileS3KeySchema = z.string().brand<'FileS3Key'>();
export type FileS3Key = string & z.BRAND<'FileS3Key'>;

export const rateLimitLogIdSchema = z.string().brand<'RateLimitLogId'>();
export type RateLimitLogId = string & z.BRAND<'RateLimitLogId'>;

export const permissionSchema = z.string().brand<'Permission'>();
export type Permission = string & z.BRAND<'Permission'>;

export const fileNameSchema = z.string().brand<'FileName'>();
export type FileName = string & z.BRAND<'FileName'>;
