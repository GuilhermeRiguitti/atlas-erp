import { TenantTitularRole } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTenantTitularDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(TenantTitularRole)
  role?: TenantTitularRole;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ownershipPercentage?: number;

  @IsOptional()
  @IsBoolean()
  isLegalRepresentative?: boolean;

  @IsOptional()
  @IsBoolean()
  canIssueInvoices?: boolean;
}
