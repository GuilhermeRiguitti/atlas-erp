import { FiscalProvider } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceInvoiceDto {
  @IsString()
  tenantId: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  issuedByUserId?: string;

  @IsOptional()
  @IsEnum(FiscalProvider)
  provider?: FiscalProvider;

  @IsString()
  @MinLength(10)
  serviceDescription: string;

  @IsOptional()
  @IsString()
  serviceCode?: string;

  @IsOptional()
  @IsString()
  cnaeCode?: string;

  @IsOptional()
  @IsString()
  municipalTaxCode?: string;

  @IsOptional()
  @IsString()
  borrowerName?: string;

  @IsOptional()
  @Matches(/^(\d{11}|\d{14})$/)
  borrowerDocument?: string;

  @IsOptional()
  @IsEmail()
  borrowerEmail?: string;

  @IsOptional()
  @IsString()
  borrowerStreet?: string;

  @IsOptional()
  @IsString()
  borrowerNumber?: string;

  @IsOptional()
  @IsString()
  borrowerNeighborhood?: string;

  @IsOptional()
  @IsString()
  borrowerCity?: string;

  @IsOptional()
  @IsString()
  borrowerState?: string;

  @IsOptional()
  @IsString()
  borrowerZipCode?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  issRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
