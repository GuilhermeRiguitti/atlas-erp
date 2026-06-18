import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantTitular } from '@prisma/client';
import { CreateTenantTitularDto } from './dto/create-tenant-titular.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/application/users.service';

const tenantInclude = {
  titulares: {
    include: {
      user: {
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
    },
    orderBy: { createdAt: 'asc' },
  },
  serviceInvoices: {
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
  fiscalCredentials: {
    select: {
      id: true,
      tenantId: true,
      provider: true,
      status: true,
      providerCompanyId: true,
      apiKeyLast4: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.TenantInclude;

type TenantWithRelations = Prisma.TenantGetPayload<{
  include: typeof tenantInclude;
}>;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(query?: string, accessWhere?: Prisma.TenantWhereInput) {
    const searchWhere: Prisma.TenantWhereInput | undefined = query
      ? {
          OR: [
            { legalName: { contains: query } },
            { tradeName: { contains: query } },
            { cnpj: { contains: query.replace(/\D/g, '') } },
          ],
        }
      : undefined;

    const conditions = [accessWhere, searchWhere].filter(
      (condition): condition is Prisma.TenantWhereInput => Boolean(condition),
    );

    const tenants = await this.prisma.tenant.findMany({
      where: conditions.length ? { AND: conditions } : undefined,
      orderBy: { createdAt: 'desc' },
      include: tenantInclude,
    });

    return tenants.map((tenant) => this.serializeTenant(tenant));
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: tenantInclude,
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.serializeTenant(tenant);
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    if (dto.cnpj) {
      await this.ensureCnpjIsAvailable(dto.cnpj, id);
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: this.normalizeUpdateTenantData(dto),
      include: tenantInclude,
    });

    return this.serializeTenant(tenant);
  }

  async addTitular(tenantId: string, dto: CreateTenantTitularDto) {
    await this.findOne(tenantId);
    await this.usersService.findOne(dto.userId);

    const titular = await this.prisma.tenantTitular
      .create({
        data: {
          tenantId,
          userId: dto.userId,
          role: dto.role,
          title: dto.title,
          ownershipPercentage: dto.ownershipPercentage,
          isLegalRepresentative: dto.isLegalRepresentative,
          canIssueInvoices: dto.canIssueInvoices,
        },
        include: {
          user: {
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
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'User is already a titular for this tenant',
          );
        }
        throw error;
      });

    return this.serializeTitular(titular);
  }

  async removeTitular(tenantId: string, titularId: string) {
    await this.findOne(tenantId);
    await this.prisma.tenantTitular.delete({ where: { id: titularId } });
    return { id: titularId };
  }

  private normalizeUpdateTenantData(
    dto: UpdateTenantDto,
  ): Prisma.TenantUpdateInput {
    return {
      ...dto,
      cnpj: dto.cnpj?.replace(/\D/g, ''),
      addressZipCode: dto.addressZipCode?.replace(/\D/g, ''),
      addressState: dto.addressState?.toUpperCase(),
    };
  }

  private async ensureCnpjIsAvailable(cnpj: string, ignoredTenantId?: string) {
    const existing = await this.prisma.tenant.findUnique({
      where: { cnpj: cnpj.replace(/\D/g, '') },
    });
    if (existing && existing.id !== ignoredTenantId) {
      throw new ConflictException('CNPJ already in use');
    }
  }

  private serializeTenant(tenant: TenantWithRelations) {
    return {
      ...tenant,
      titulares: tenant.titulares.map((titular) =>
        this.serializeTitular(titular),
      ),
      serviceInvoices: tenant.serviceInvoices.map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount),
        deductions: Number(invoice.deductions),
        issRate: invoice.issRate ? Number(invoice.issRate) : null,
      })),
      fiscalCredentials: tenant.fiscalCredentials.map((credential) => ({
        ...credential,
        hasApiKey: Boolean(credential.apiKeyLast4),
      })),
    };
  }

  private serializeTitular(titular: TenantTitular & { user?: unknown }) {
    return {
      ...titular,
      ownershipPercentage: titular.ownershipPercentage
        ? Number(titular.ownershipPercentage)
        : null,
    };
  }
}
