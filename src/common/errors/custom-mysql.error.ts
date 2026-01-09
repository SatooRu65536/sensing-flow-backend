import { ErrorCode } from '@/common/utils/drizzle-error';

/**
 * ユニットテスト用のMySQLエラー例外クラス
 */
export class CustomMySQLError extends Error {
  code?: ErrorCode | 'ER_SOME_OTHER_ERROR';
  constructor(code: ErrorCode | 'ER_SOME_OTHER_ERROR') {
    super();
    this.code = code;
    this.name = 'CustomMySQLError';
  }
}
