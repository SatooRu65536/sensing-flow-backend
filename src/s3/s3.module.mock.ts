import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { createS3ServiceMock } from '@/common/utils/test/service-mocks';

@Module({
  providers: [
    {
      provide: S3Service,
      useValue: createS3ServiceMock(),
    },
  ],
  exports: [S3Service],
})
export class S3ModuleMock {}
