import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/application/users.service';

const clientInclude = {
  tenant: {
    select: {
      id: true,
      legalName: true,
      tradeName: true,
      cnpj: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ClientInclude;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateClientDto) {
    await this.ensureTenantExists(dto.tenantId);
    await this.usersService.findOne(dto.createdByUserId);
    await this.ensureDocumentIsAvailable(dto.tenantId, dto.document);

    const client = await this.prisma.client.create({
      data: this.normalizeCreateClientData(dto),
      include: clientInclude,
    });

    return client;
  }

  async findAll(tenantId?: string, query?: string) {
    const normalizedQuery = query?.trim();
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId,
        ...(normalizedQuery
          ? {
              OR: [
                { name: { contains: normalizedQuery } },
                { tradeName: { contains: normalizedQuery } },
                { email: { contains: normalizedQuery } },
                { document: { contains: normalizedQuery.replace(/\D/g, '') } },
              ],
            }
          : {}),
      },
      include: clientInclude,
      orderBy: { createdAt: 'desc' },
    });

    return clients;
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: clientInclude,
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const current = await this.findOne(id);
    if (dto.document || dto.tenantId) {
      await this.ensureDocumentIsAvailable(
        dto.tenantId ?? current.tenantId,
        dto.document ?? current.document,
        id,
      );
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: this.normalizeUpdateClientData(dto),
      include: clientInclude,
    });

    return client;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.client.delete({ where: { id } });
    return { id };
  }

  async ensureClientBelongsToTenant(clientId: string, tenantId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client || client.tenantId !== tenantId) {
      throw new NotFoundException('Client not found for tenant');
    }

    return client;
  }

  private normalizeCreateClientData(
    dto: CreateClientDto,
  ): Prisma.ClientCreateInput {
    return {
      type: dto.type,
      status: dto.status,
      name: dto.name,
      tradeName: dto.tradeName,
      document: dto.document.replace(/\D/g, ''),
      email: dto.email,
      phone: dto.phone?.replace(/\D/g, ''),
      municipalRegistration: dto.municipalRegistration,
      stateRegistration: dto.stateRegistration,
      addressStreet: dto.addressStreet,
      addressNumber: dto.addressNumber,
      addressComplement: dto.addressComplement,
      addressNeighborhood: dto.addressNeighborhood,
      addressCity: dto.addressCity,
      addressState: dto.addressState?.toUpperCase(),
      addressZipCode: dto.addressZipCode?.replace(/\D/g, ''),
      notes: dto.notes,
      tenant: { connect: { id: dto.tenantId } },
      createdBy: { connect: { id: dto.createdByUserId } },
    };
  }

  private normalizeUpdateClientData(
    dto: UpdateClientDto,
  ): Prisma.ClientUpdateInput {
    return {
      type: dto.type,
      status: dto.status,
      name: dto.name,
      tradeName: dto.tradeName,
      document: dto.document?.replace(/\D/g, ''),
      email: dto.email,
      phone: dto.phone?.replace(/\D/g, ''),
      municipalRegistration: dto.municipalRegistration,
      stateRegistration: dto.stateRegistration,
      addressStreet: dto.addressStreet,
      addressNumber: dto.addressNumber,
      addressComplement: dto.addressComplement,
      addressNeighborhood: dto.addressNeighborhood,
      addressCity: dto.addressCity,
      addressState: dto.addressState?.toUpperCase(),
      addressZipCode: dto.addressZipCode?.replace(/\D/g, ''),
      notes: dto.notes,
      tenant: dto.tenantId ? { connect: { id: dto.tenantId } } : undefined,
      createdBy: dto.createdByUserId
        ? { connect: { id: dto.createdByUserId } }
        : undefined,
    };
  }

  private async ensureTenantExists(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
  }

  private async ensureDocumentIsAvailable(
    tenantId: string,
    document: string,
    ignoredClientId?: string,
  ) {
    const existing = await this.prisma.client.findUnique({
      where: {
        tenantId_document: {
          tenantId,
          document: document.replace(/\D/g, ''),
        },
      },
    });

    if (existing && existing.id !== ignoredClientId) {
      throw new ConflictException('Client document already exists for tenant');
    }
  }
}
