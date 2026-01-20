import { SensorsEnum } from './sensor-data.schema';

export interface UploadStatusInvalidType {
  success: false;
  sensor: string;
  fileS3Key: null;
  reason: 'Invalid sensor type';
}
export interface UploadStatusAlreadyUploaded {
  success: false;
  sensor: string;
  fileS3Key: string;
  reason: 'Sensor data already uploaded';
}
export interface UploadStatusUploadFailed {
  success: false;
  sensor: string;
  fileS3Key: string;
  reason: 'Upload failed';
}
export interface UploadStatusSuccess {
  success: true;
  sensor: SensorsEnum;
  fileS3Key: string;
}

export type UploadStatus =
  | UploadStatusInvalidType
  | UploadStatusAlreadyUploaded
  | UploadStatusUploadFailed
  | UploadStatusSuccess;
