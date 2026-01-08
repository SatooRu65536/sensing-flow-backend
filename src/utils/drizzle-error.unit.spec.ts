import { handleDrizzleError, CustomDrizzleError, ErrorCodeEnum } from './drizzle-error';
import { DrizzleQueryError } from 'drizzle-orm';

describe('handleDrizzleError', () => {
  it('重複エラーの場合は CustomDrizzleError で DUPLICATE_ENTRY を返す', () => {
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

  it('未知のエラーコードの場合は CustomDrizzleError で UNKNOWN を返す', () => {
    class MySQLError extends Error {
      code?: string;
      constructor(code: string) {
        super();
        this.code = code;
      }
    }

    const error = new DrizzleQueryError('Some other error', [], new MySQLError('ER_SOME_OTHER_ERROR'));
    const result = handleDrizzleError(error);

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });

  it('エラーコードがない場合は CustomDrizzleError で UNKNOWN を返す', () => {
    const error = new DrizzleQueryError('Some other error', [], new Error());
    const result = handleDrizzleError(error);

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });

  it('不明なエラーの場合は CustomDrizzleError で UNKNOWN を返す', () => {
    const result = handleDrizzleError(new Error('Some other error'));

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });

  it('非エラーオブジェクトの場合は CustomDrizzleError で UNKNOWN を返す', () => {
    const result = handleDrizzleError('Some string error');

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });
});
