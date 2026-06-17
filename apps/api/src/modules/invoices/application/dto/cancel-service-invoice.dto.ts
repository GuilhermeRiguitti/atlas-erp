import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelServiceInvoiceDto {
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  reason: string;

  @IsOptional()
  @IsString()
  actorUserId?: string;
}
