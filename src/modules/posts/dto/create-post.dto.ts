import { PostType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description: string;

  @IsEnum(PostType, { message: 'Invalid post type' })
  @IsNotEmpty()
  postType: PostType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsBoolean()
  @IsOptional()
  isPromoted?: boolean;

  @IsDateString()
  @IsOptional()
  promoteUntil?: string;
}
