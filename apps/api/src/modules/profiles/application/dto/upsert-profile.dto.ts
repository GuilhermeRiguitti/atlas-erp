import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;
}
