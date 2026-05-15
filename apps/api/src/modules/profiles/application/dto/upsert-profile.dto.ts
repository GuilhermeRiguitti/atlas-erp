import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpsertProfileDto {
  @IsString()
  @MinLength(4)
  headline: string;

  @IsString()
  @MinLength(20)
  bio: string;

  @IsString()
  location: string;

  @IsString()
  seniority: string;

  @IsString()
  skills: string;

  @IsString()
  availability: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsUrl()
  github?: string;

  @IsOptional()
  @IsUrl()
  linkedin?: string;
}
