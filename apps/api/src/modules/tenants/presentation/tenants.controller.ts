import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateTenantTitularDto } from '../application/dto/create-tenant-titular.dto';
import { UpsertTenantFiscalCredentialDto } from '../application/dto/upsert-tenant-fiscal-credential.dto';
import { TenantFiscalCredentialsService } from '../application/tenant-fiscal-credentials.service';
import { UpdateTenantDto } from '../application/dto/update-tenant.dto';
import { TenantsService } from '../application/tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly fiscalCredentialsService: TenantFiscalCredentialsService,
  ) {}

  @Get()
  findAll(@Query('q') query?: string) {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Post(':id/titulares')
  addTitular(@Param('id') id: string, @Body() dto: CreateTenantTitularDto) {
    return this.tenantsService.addTitular(id, dto);
  }

  @Get(':id/fiscal-credentials')
  findFiscalCredentials(@Param('id') id: string) {
    return this.fiscalCredentialsService.findAll(id);
  }

  @Put(':id/fiscal-credentials')
  upsertFiscalCredential(
    @Param('id') id: string,
    @Body() dto: UpsertTenantFiscalCredentialDto,
  ) {
    return this.fiscalCredentialsService.upsert(id, dto);
  }

  @Delete(':tenantId/titulares/:titularId')
  removeTitular(
    @Param('tenantId') tenantId: string,
    @Param('titularId') titularId: string,
  ) {
    return this.tenantsService.removeTitular(tenantId, titularId);
  }
}
