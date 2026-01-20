export type S3Key = string & { __brand: 'S3Key' };

export type MultipartUploadIdentifier = {
  id: string;
  key: S3Key;
  uploadId: string;
};

export interface MultipartUploadPart {
  PartNumber: number;
  ETag: string;
}
export type MultipartUploadParts = MultipartUploadPart[];
