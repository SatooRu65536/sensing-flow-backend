export function createDbServiceMock(overrides: Record<string, any> = {}) {
  const dbMock = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    query: {
      SensorUploadSchema: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      UserSchema: {
        findFirst: vi.fn(),
      },
    },
    transaction: vi.fn().mockImplementation(async <T>(callback: (tx: any) => Promise<T>) => await callback(dbMock)),
    rollback: vi.fn(),
    ...overrides,
  };

  return dbMock;
}
export type DbMock = ReturnType<typeof createDbServiceMock>;
