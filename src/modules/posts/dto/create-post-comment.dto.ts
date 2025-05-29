import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePostCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  @IsOptional()
  parentId?: number;
}
