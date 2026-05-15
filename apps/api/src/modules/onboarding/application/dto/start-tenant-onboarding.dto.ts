import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateTenantDto } from '../../../tenants/application/dto/create-tenant.dto';

export class CreateInitialTitularDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ownershipPercentage?: number;

  @IsOptional()
  @IsBoolean()
  isLegalRepresentative?: boolean;

  @IsOptional()
  @IsBoolean()
  canIssueInvoices?: boolean;
}

export class StartTenantOnboardingDto {
  @IsString()
  token: string;

  @ValidateNested()
  @Type(() => CreateTenantDto)
  tenant: CreateTenantDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInitialTitularDto)
  titular?: CreateInitialTitularDto;
}
