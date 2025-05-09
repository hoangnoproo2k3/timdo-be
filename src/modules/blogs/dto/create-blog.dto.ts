import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsISO8601,
} from 'class-validator';
import { ArticleStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class MediaItemDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}

export class TagDto {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsOptional()
  count?: number;
}

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  publishedAt?: string;

  @IsInt()
  @IsOptional()
  readingTime?: number;

  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags?: TagDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  mediaItems?: MediaItemDto[];
}
