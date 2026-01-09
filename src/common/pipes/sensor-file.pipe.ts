import { ParseFilePipeBuilder } from '@nestjs/common';

type Unit = 'KB' | 'MB' | 'GB';

export const FilePipe = (maxSize: number, unit: Unit = 'MB') => {
  let maxSizeBytes: number;
  switch (unit) {
    case 'KB':
      maxSizeBytes = maxSize * 1024;
      break;
    case 'GB':
      maxSizeBytes = maxSize * 1024 * 1024 * 1024;
      break;
    case 'MB':
    default:
      maxSizeBytes = maxSize * 1024 * 1024;
      break;
  }

  return new ParseFilePipeBuilder().addMaxSizeValidator({ maxSize: maxSizeBytes }).build();
};
