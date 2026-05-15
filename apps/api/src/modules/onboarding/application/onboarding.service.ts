import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  TenantStatus,
  TenantTitularRole,
  User,
  UserStatus,
} from '@prisma/client';
import { JwtPayload, verify } from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { StartTenantOnboardingDto } from './dto/start-tenant-onboarding.dto';

type OnboardingTokenPayload = JwtPayload & {
  purpose?: 'tenant_onboarding';
  sub: string;
};

const onboardingTenantInclude = {
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
} satisfies Prisma.TenantInclude;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async validateOnboardingToken(token: string) {
    const { payload, user } = await this.resolveTokenUser(token);

    return {
      user: this.sanitizeUser(user),
      expiresAt: payload.exp
        ? new Date(payload.exp * 1000).toISOString()
        : null,
    };
  }

  async startTenantOnboarding(dto: StartTenantOnboardingDto) {
    const cnpj = onlyDigits(dto.tenant.cnpj);
    const { user } = await this.resolveTokenUser(dto.token);

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { cnpj },
    });
    if (existingTenant) {
      throw new ConflictException('CNPJ already in use');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: this.buildTenantData(dto, cnpj),
      });

      const titularUser =
        user.status === UserStatus.INVITED
          ? await tx.user.update({
              where: { id: user.id },
              data: { status: UserStatus.ACTIVE },
            })
          : user;

      const titular = await tx.tenantTitular.create({
        data: {
          tenantId: tenant.id,
          userId: titularUser.id,
          role: TenantTitularRole.OWNER,
          title: dto.titular?.title ?? 'Titular responsavel',
          ownershipPercentage: dto.titular?.ownershipPercentage ?? 100,
          isLegalRepresentative: dto.titular?.isLegalRepresentative ?? true,
          canIssueInvoices: dto.titular?.canIssueInvoices ?? true,
        },
      });

      const tenantWithRelations = await tx.tenant.findUniqueOrThrow({
        where: { id: tenant.id },
        include: onboardingTenantInclude,
      });

      return { tenant: tenantWithRelations, titular, user: titularUser };
    });

    return {
      tenant: {
        ...result.tenant,
        titulares: result.tenant.titulares.map((titular) => ({
          ...titular,
          ownershipPercentage: titular.ownershipPercentage
            ? Number(titular.ownershipPercentage)
            : null,
        })),
        serviceInvoices: result.tenant.serviceInvoices.map((invoice) => ({
          ...invoice,
          amount: Number(invoice.amount),
          deductions: Number(invoice.deductions),
          issRate: invoice.issRate ? Number(invoice.issRate) : null,
        })),
      },
      user: this.sanitizeUser(result.user),
      titular: {
        ...result.titular,
        ownershipPercentage: result.titular.ownershipPercentage
          ? Number(result.titular.ownershipPercentage)
          : null,
      },
    };
  }

  private async resolveTokenUser(token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Onboarding token is required');
    }

    const payload = this.verifyToken(token);
    if (!payload.sub) {
      throw new BadRequestException('Onboarding token subject is missing');
    }

    if (payload.purpose && payload.purpose !== 'tenant_onboarding') {
      throw new BadRequestException('Invalid onboarding token purpose');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('Onboarding user not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Onboarding user is suspended');
    }

    return { payload, user };
  }

  private verifyToken(token: string): OnboardingTokenPayload {
    const secret = this.configService.get<string>('ONBOARDING_JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'ONBOARDING_JWT_SECRET is not configured',
      );
    }

    try {
      return verify(token, secret) as OnboardingTokenPayload;
    } catch {
      throw new BadRequestException('Invalid or expired onboarding token');
    }
  }

  private buildTenantData(
    dto: StartTenantOnboardingDto,
    cnpj: string,
  ): Prisma.TenantCreateInput {
    return {
      ...dto.tenant,
      cnpj,
      status: TenantStatus.ONBOARDING,
      tradeName: optional(dto.tenant.tradeName),
      municipalRegistration: optional(dto.tenant.municipalRegistration),
      stateRegistration: optional(dto.tenant.stateRegistration),
      cnae: optional(dto.tenant.cnae),
      serviceTaxCode: optional(dto.tenant.serviceTaxCode),
      municipalServiceCode: optional(dto.tenant.municipalServiceCode),
      fiscalProviderCompanyId: optional(dto.tenant.fiscalProviderCompanyId),
      contactPhone: optional(dto.tenant.contactPhone),
      addressComplement: optional(dto.tenant.addressComplement),
      addressZipCode: onlyDigits(dto.tenant.addressZipCode),
      addressState: dto.tenant.addressState.toUpperCase(),
    };
  }

  private sanitizeUser(user: User) {
    const safeUser = { ...user };
    delete (safeUser as Partial<User>).passwordHash;
    return safeUser;
  }
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function optional(value?: string) {
  return value?.trim() ? value.trim() : undefined;
}
