import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindAllUsersDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'username' | 'email';

  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC';
}