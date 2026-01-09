import { ErrorCode } from '@/common/utils/drizzle-error';

/**
 * ユニットテスト用のMySQLエラー例外クラス
 */
export class CustomMySQLError extends Error {
  code?: ErrorCode;
  constructor(code: ErrorCode) {
    super();
    this.code = code;
    this.name = 'CustomMySQLError';
  }
}
