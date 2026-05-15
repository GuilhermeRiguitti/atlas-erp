import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FiscalProvider,
  TenantFiscalCredential,
  TenantFiscalCredentialStatus,
} from '@prisma/client';
import { UpsertTenantFiscalCredentialDto } from './dto/upsert-tenant-fiscal-credential.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantSecretCryptoService } from '../infrastructure/tenant-secret-crypto.service';

@Injectable()
export class TenantFiscalCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TenantSecretCryptoService,
  ) {}

  async findAll(tenantId: string) {
    await this.ensureTenantExists(tenantId);
    const credentials = await this.prisma.tenantFiscalCredential.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return credentials.map((credential) => this.serialize(credential));
  }

  async upsert(tenantId: string, dto: UpsertTenantFiscalCredentialDto) {
    await this.ensureTenantExists(tenantId);

    const existing = await this.prisma.tenantFiscalCredential.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: dto.provider,
        },
      },
    });

    if (!existing && !dto.apiKey) {
      throw new BadRequestException('apiKey is required for new credentials');
    }

    const apiKeyData = dto.apiKey
      ? {
          encryptedApiKey: this.crypto.encrypt(dto.apiKey),
          apiKeyLast4: dto.apiKey.slice(-4),
        }
      : {};

    const credential = await this.prisma.tenantFiscalCredential.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider: dto.provider,
        },
      },
      create: {
        tenantId,
        provider: dto.provider,
        providerCompanyId: dto.providerCompanyId,
        status: dto.status ?? TenantFiscalCredentialStatus.ACTIVE,
        encryptedApiKey: apiKeyData.encryptedApiKey ?? '',
        apiKeyLast4: apiKeyData.apiKeyLast4,
      },
      update: {
        providerCompanyId: dto.providerCompanyId,
        status: dto.status,
        ...apiKeyData,
      },
    });

    return this.serialize(credential);
  }

  async getActiveCredential(tenantId: string, provider: FiscalProvider) {
    const credential = await this.prisma.tenantFiscalCredential.findFirst({
      where: {
        tenantId,
        provider,
        status: TenantFiscalCredentialStatus.ACTIVE,
      },
    });

    if (!credential) {
      throw new BadRequestException(
        `Active fiscal credential is not configured for provider ${provider}`,
      );
    }

    return {
      provider: credential.provider,
      providerCompanyId: credential.providerCompanyId,
      apiKey: this.crypto.decrypt(credential.encryptedApiKey),
    };
  }

  private async ensureTenantExists(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
  }

  private serialize(credential: TenantFiscalCredential) {
    return {
      id: credential.id,
      tenantId: credential.tenantId,
      provider: credential.provider,
      status: credential.status,
      providerCompanyId: credential.providerCompanyId,
      apiKeyLast4: credential.apiKeyLast4,
      hasApiKey: Boolean(credential.encryptedApiKey),
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }
}
