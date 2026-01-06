import { describe, expect, it } from 'vitest';
import { handleDrizzleError, CustomDrizzleError, ErrorCodeEnum } from './drizzle-error';
import { DrizzleQueryError } from 'drizzle-orm';

describe('handleDrizzleError', () => {
  it('should return CustomDrizzleError for duplicate entry error', () => {
    class MySQLError extends Error {
      code?: string;
      constructor(code: string) {
        super();
        this.code = code;
      }
    }

    const error = new DrizzleQueryError('Duplicate entry', [], new MySQLError('ER_DUP_ENTRY'));
    const result = handleDrizzleError(error);

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.DUPLICATE_ENTRY);
  });

  it('should return CustomDrizzleError for unknown error', () => {
    const result = handleDrizzleError(new Error('Some other error'));

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });
});
