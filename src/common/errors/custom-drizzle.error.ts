export const ErrorCodeEnum = {
  DUPLICATE_ENTRY: 'ER_DUP_ENTRY',
  ER_DBACCESS_DENIED_ERROR: 'ER_DBACCESS_DENIED_ERROR',
  UNKNOWN: 'UNKNOWN',
};
export type ErrorCode = keyof typeof ErrorCodeEnum;
export type ErrorCodeValue = (typeof ErrorCodeEnum)[ErrorCode];

export class CustomDrizzleError extends Error {
  code: ErrorCodeValue;

  constructor(message: string, code: ErrorCodeValue, cause?: unknown) {
    super(message, { cause });
    this.code = code;
    this.name = 'CustomDrizzleError';
  }
}
