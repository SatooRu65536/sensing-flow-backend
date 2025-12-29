import { DrizzleQueryError } from 'drizzle-orm';

export enum ErrorCodeEnum {
  DUPLICATE_ENTRY = 'ER_DUP_ENTRY',
  UNKNOWN = 'UNKNOWN',
}

class CustomDrizzleError extends Error {
  code: ErrorCodeEnum;

  constructor(message: string, code: ErrorCodeEnum, cause?: unknown) {
    super(message, { cause });
    this.code = code;
    this.name = 'CustomDrizzleError';
  }
}

export function handleDrizzleError(error: unknown): CustomDrizzleError {
  if (error instanceof DrizzleQueryError) {
    const cause = error.cause as { code?: string } | undefined;
    if (cause?.code) {
      switch (cause.code) {
        case 'ER_DUP_ENTRY':
          return new CustomDrizzleError('Duplicate entry error', ErrorCodeEnum.DUPLICATE_ENTRY, error);
      }
    }
  }
  // その他のエラーはそのまま投げる
  return new CustomDrizzleError('Unknown error', ErrorCodeEnum.UNKNOWN, error);
}
