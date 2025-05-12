import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaItemDto, TagDto } from './create-blog.dto';
import { ArticleStatus } from '@prisma/client';

export class UpdateBlogDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  @MinLength(20)
  content?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  featuredImage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaDescription?: string;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsInt()
  @IsOptional()
  readingTime?: number;

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsISO8601({ strict: true })
  @IsOptional()
  publishedAt?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  mediaItems?: MediaItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags?: TagDto[];
}
