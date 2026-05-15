import { ClientStatus, ClientType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  tenantId: string;

  @IsString()
  createdByUserId: string;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @Matches(/^(\d{11}|\d{14})$/)
  document: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsString()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  addressNumber?: string;

  @IsOptional()
  @IsString()
  addressComplement?: string;

  @IsOptional()
  @IsString()
  addressNeighborhood?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  addressState?: string;

  @IsOptional()
  @Matches(/^\d{8}$/)
  addressZipCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
