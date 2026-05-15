import { FiscalProvider, TenantStatus, TenantTaxRegime } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(3)
  legalName: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @Matches(/^\d{14}$/)
  cnpj: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsEnum(TenantTaxRegime)
  taxRegime?: TenantTaxRegime;

  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsString()
  serviceTaxCode?: string;

  @IsOptional()
  @IsString()
  municipalServiceCode?: string;

  @IsOptional()
  @IsEnum(FiscalProvider)
  fiscalProvider?: FiscalProvider;

  @IsOptional()
  @IsString()
  fiscalProviderCompanyId?: string;

  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsString()
  addressStreet: string;

  @IsString()
  addressNumber: string;

  @IsOptional()
  @IsString()
  addressComplement?: string;

  @IsString()
  addressNeighborhood: string;

  @IsString()
  addressCity: string;

  @IsString()
  @Length(2, 2)
  addressState: string;

  @Matches(/^\d{7}$/)
  addressCityIbgeCode: string;

  @Matches(/^\d{8}$/)
  addressZipCode: string;
}
