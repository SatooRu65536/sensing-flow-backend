export enum ErrorCodeEnum {
  DUPLICATE_ENTRY = 'ER_DUP_ENTRY',
  ER_DBACCESS_DENIED_ERROR = 'ER_DBACCESS_DENIED_ERROR',
  UNKNOWN = 'UNKNOWN',
}
export type ErrorCode = 'ER_DUP_ENTRY' | 'ER_DBACCESS_DENIED_ERROR' | 'UNKNOWN';

export class CustomDrizzleError extends Error {
  code: ErrorCodeEnum;

  constructor(message: string, code: ErrorCodeEnum, cause?: unknown) {
    super(message, { cause });
    this.code = code;
    this.name = 'CustomDrizzleError';
  }
}
