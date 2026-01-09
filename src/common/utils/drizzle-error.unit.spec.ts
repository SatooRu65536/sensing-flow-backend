import { CustomMySQLError } from '@/common/errors/custom-mysql.error';
import { handleDrizzleError, CustomDrizzleError, ErrorCodeEnum } from './drizzle-error';
import { DrizzleQueryError } from 'drizzle-orm';

describe('handleDrizzleError', () => {
  it('重複エラーの場合は DUPLICATE_ENTRY を返す', () => {
    const error = new DrizzleQueryError('Duplicate entry', [], new CustomMySQLError('ER_DUP_ENTRY'));
    const result = handleDrizzleError(error);

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.DUPLICATE_ENTRY);
  });

  it('未知のエラーコードの場合は UNKNOWN を返す', () => {
    const error = new DrizzleQueryError('Some other error', [], new CustomMySQLError('ER_SOME_OTHER_ERROR'));
    const result = handleDrizzleError(error);

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });

  it('エラーコードがない場合は UNKNOWN を返す', () => {
    const error = new DrizzleQueryError('Some other error', [], new Error());
    const result = handleDrizzleError(error);

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });

  it('不明なエラーの場合は UNKNOWN を返す', () => {
    const result = handleDrizzleError(new Error('Some other error'));

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });

  it('非エラーオブジェクトの場合は UNKNOWN を返す', () => {
    const result = handleDrizzleError('Some string error');

    expect(result).toBeInstanceOf(CustomDrizzleError);
    expect(result.code).toBe(ErrorCodeEnum.UNKNOWN);
  });
});
