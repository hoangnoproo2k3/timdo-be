import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class PostServicePackageDto {
  @IsInt()
  @Min(2)
  packageId: number;

  @IsString()
  @IsNotEmpty()
  paymentProofUrl: string;
}
