import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpgradePostDto {
  @IsInt()
  @Min(2) // Gói nâng cấp phải là trả phí
  packageId: number;

  @IsString()
  @IsNotEmpty()
  paymentProofUrl: string;
}
