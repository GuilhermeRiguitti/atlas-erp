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
import { Auth } from '../../authorization/auth-context';
import type { AuthContext } from '../../authorization/auth-context';
import { TenantAccessService } from '../../authorization/tenant-access.service';
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
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  findAll(@Auth() auth: AuthContext, @Query('q') query?: string) {
    return this.tenantsService.findAll(
      query,
      this.tenantAccess.accessibleTenantWhere(auth),
    );
  }

  @Get(':id')
  async findOne(@Auth() auth: AuthContext, @Param('id') id: string) {
    await this.tenantAccess.assertTenantAccess(auth, id);
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    await this.tenantAccess.assertTenantAccess(auth, id);
    return this.tenantsService.update(id, dto);
  }

  @Post(':id/titulares')
  async addTitular(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: CreateTenantTitularDto,
  ) {
    await this.tenantAccess.assertTenantAccess(auth, id);
    return this.tenantsService.addTitular(id, dto);
  }

  @Get(':id/fiscal-credentials')
  async findFiscalCredentials(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
  ) {
    await this.tenantAccess.assertTenantAccess(auth, id);
    return this.fiscalCredentialsService.findAll(id);
  }

  @Put(':id/fiscal-credentials')
  async upsertFiscalCredential(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpsertTenantFiscalCredentialDto,
  ) {
    await this.tenantAccess.assertTenantAccess(auth, id);
    return this.fiscalCredentialsService.upsert(id, dto);
  }

  @Delete(':tenantId/titulares/:titularId')
  async removeTitular(
    @Auth() auth: AuthContext,
    @Param('tenantId') tenantId: string,
    @Param('titularId') titularId: string,
  ) {
    await this.tenantAccess.assertTenantAccess(auth, tenantId);
    return this.tenantsService.removeTitular(tenantId, titularId);
  }
}
