import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { PresignedUrlDto } from './presigned-url.dto';
import { S3Service } from './s3.service';

@Controller('/v1/s3')
// @UseGuards(JwtAuthGuard)
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('presigned-url')
  async getPresignedUrl(@Body() body: PresignedUrlDto) {
    if (!body.fileType || !body.folder) {
      throw new BadRequestException('fileType and folder are required');
    }
    return this.s3Service.createPresignedUrl(body.fileType, body.folder);
  }
}
