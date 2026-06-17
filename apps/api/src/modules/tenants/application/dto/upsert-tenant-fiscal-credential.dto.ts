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

  /**
   * Certificado A1 ICP-Brasil (.pfx) em base64. Usado por providers de emissao
   * nativa via mTLS, como a NFS-e Nacional. Criptografado em repouso.
   */
  @IsOptional()
  @IsString()
  @MinLength(16)
  certificatePfxBase64?: string;

  @IsOptional()
  @IsString()
  certificatePassword?: string;

  @IsOptional()
  @IsEnum(TenantFiscalCredentialStatus)
  status?: TenantFiscalCredentialStatus;
}
