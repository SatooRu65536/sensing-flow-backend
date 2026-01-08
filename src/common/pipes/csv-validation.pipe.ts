import { PipeTransform, BadRequestException } from '@nestjs/common';

export class CsvValidationPipe implements PipeTransform<string> {
  transform(value: string) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('CSV body must not be empty');
    }
    return value;
  }
}
