import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { MultipartUploadService } from './multipart-upload.service';
import { Authed } from '@/common/decorators/auth.decorator';
import {
  AbortMultipartUploadResponse,
  CompleteMultipartUploadResponse,
  ListMultipartUploadResponse,
  PostMultipartUploadResponse,
  StartMultipartUploadRequest,
  StartMultipartUploadResponse,
} from './multipart-upload.dto';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { Permission } from '@/common/decorators/permission.decorator';
import { User } from '@/users/users.dto';
import { CsvValidationPipe } from '@/common/pipes/csv-validation.pipe';

@Controller('multipart-upload')
export class MultipartUploadController {
  constructor(private readonly multipartUploadService: MultipartUploadService) {}

  @Get()
  @ApiResponse({ type: ListMultipartUploadResponse })
  @Permission('list:multipart_upload')
  async listMultipartUploads(@Authed() user: User): Promise<ListMultipartUploadResponse> {
    return this.multipartUploadService.listMultipartUploads(user);
  }

  @Post()
  @ApiBody({ type: StartMultipartUploadRequest })
  @ApiResponse({ type: StartMultipartUploadResponse })
  @Permission('post:multipart_upload')
  async startMultipartUpload(
    @Authed() user: User,
    @Body() body: StartMultipartUploadRequest,
  ): Promise<StartMultipartUploadResponse> {
    return this.multipartUploadService.startMultipartUpload(user, body);
  }

  @Put(':uploadId')
  @ApiConsumes('text/csv')
  @ApiBody({ description: 'CSVデータ', type: String })
  @ApiResponse({ type: PostMultipartUploadResponse })
  @Permission('post:multipart_upload')
  async postMultipartUpload(
    @Body(new CsvValidationPipe()) body: string,
    @Authed() user: User,
    @Param('uploadId') uploadId: string,
  ): Promise<PostMultipartUploadResponse> {
    return this.multipartUploadService.postMultipartUpload(user, uploadId, body);
  }

  @Patch(':uploadId')
  @ApiResponse({ type: CompleteMultipartUploadResponse })
  @Permission('post:multipart_upload')
  async completeMultipartUpload(
    @Authed() user: User,
    @Param('uploadId') uploadId: string,
  ): Promise<CompleteMultipartUploadResponse> {
    return this.multipartUploadService.completeMultipartUpload(user, uploadId);
  }

  @Delete(':uploadId')
  @ApiResponse({ type: AbortMultipartUploadResponse })
  @Permission('abort:multipart_upload')
  async abortMultipartUpload(
    @Authed() user: User,
    @Param('uploadId') uploadId: string,
  ): Promise<AbortMultipartUploadResponse> {
    return this.multipartUploadService.abortMultipartUpload(user, uploadId);
  }
}
