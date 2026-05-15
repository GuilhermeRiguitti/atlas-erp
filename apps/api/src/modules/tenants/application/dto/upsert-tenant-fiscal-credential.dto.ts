import { FiscalProvider, TenantFiscalCredentialStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertTenantFiscalCredentialDto {
  @IsEnum(FiscalProvider)
  provider: FiscalProvider;

  @IsString()
  @MinLength(2)
  providerCompanyId: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  apiKey?: string;

  @IsOptional()
  @IsEnum(TenantFiscalCredentialStatus)
  status?: TenantFiscalCredentialStatus;
}
