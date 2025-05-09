import { IsIn, IsString } from 'class-validator';

export class PresignedUrlDto {
  @IsString()
  fileType: string;

  @IsIn(['timdo', 'nhatduoc', 'payment-proofs'])
  folder: 'timdo' | 'nhatduoc' | 'payment-proofs';
}
