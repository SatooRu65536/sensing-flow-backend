import { S3Key } from '@/s3/s3.types';

export function createDbServiceMock(overrides: Record<string, any> = {}) {
  const dbMock = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    query: {
      MultipartUploadSchema: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      UserSchema: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      SensorDataSchema: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    transaction: vi.fn().mockImplementation(async <T>(callback: (tx: any) => Promise<T>) => await callback(dbMock)),
    rollback: vi.fn(),
    ...overrides,
  };

  return dbMock;
}
export type DbMock = ReturnType<typeof createDbServiceMock>;

export function createS3ServiceMock(overrides: Record<string, any> = {}) {
  return {
    putObject: vi.fn(),
    deleteObject: vi.fn(),
    createMultipartUpload: vi.fn(),
    postMultipartUpload: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    getPresignedUrl: vi.fn(),
    getUploadS3Key: vi.fn().mockReturnValue('multipart/upload/key' as S3Key),
    ...overrides,
  };
}
export type S3ServiceMock = ReturnType<typeof createS3ServiceMock>;
