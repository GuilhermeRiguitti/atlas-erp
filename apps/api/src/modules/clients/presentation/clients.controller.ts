import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../authorization/auth-context';
import type { AuthContext } from '../../authorization/auth-context';
import { TenantAccessService } from '../../authorization/tenant-access.service';
import { ClientsService } from '../application/clients.service';
import { CreateClientDto } from '../application/dto/create-client.dto';
import { UpdateClientDto } from '../application/dto/update-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Post()
  async create(@Auth() auth: AuthContext, @Body() dto: CreateClientDto) {
    await this.tenantAccess.assertTenantAccess(auth, dto.tenantId);
    return this.clientsService.create(dto);
  }

  @Get()
  async findAll(
    @Auth() auth: AuthContext,
    @Query('tenantId') tenantId?: string,
    @Query('q') query?: string,
  ) {
    if (tenantId) {
      await this.tenantAccess.assertTenantAccess(auth, tenantId);
    } else if (!this.tenantAccess.isPlatformAdmin(auth)) {
      throw new BadRequestException('tenantId is required');
    }
    return this.clientsService.findAll(tenantId, query);
  }

  @Get(':id')
  async findOne(@Auth() auth: AuthContext, @Param('id') id: string) {
    const client = await this.clientsService.findOne(id);
    await this.tenantAccess.assertTenantAccess(auth, client.tenantId);
    return client;
  }

  @Patch(':id')
  async update(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const client = await this.clientsService.findOne(id);
    await this.tenantAccess.assertTenantAccess(auth, client.tenantId);
    if (dto.tenantId && dto.tenantId !== client.tenantId) {
      await this.tenantAccess.assertTenantAccess(auth, dto.tenantId);
    }
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Auth() auth: AuthContext, @Param('id') id: string) {
    const client = await this.clientsService.findOne(id);
    await this.tenantAccess.assertTenantAccess(auth, client.tenantId);
    return this.clientsService.remove(id);
  }
}
