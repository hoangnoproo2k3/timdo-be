import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ModerateAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  CONFIRM_PAYMENT = 'confirm_payment',
}

export class ModeratePostDto {
  @IsEnum(ModerateAction)
  @IsNotEmpty()
  action: ModerateAction;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsOptional()
  notifyUser?: boolean;
}
