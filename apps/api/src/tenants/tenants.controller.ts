import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateTenantTitularDto } from './dto/create-tenant-titular.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

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

  @Delete(':tenantId/titulares/:titularId')
  removeTitular(
    @Param('tenantId') tenantId: string,
    @Param('titularId') titularId: string,
  ) {
    return this.tenantsService.removeTitular(tenantId, titularId);
  }
}
