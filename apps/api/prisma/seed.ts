import {
  ClientType,
  FiscalProvider,
  PrismaClient,
  TenantTaxRegime,
  TenantTitularRole,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PRODUCTION_SEED !== 'true'
  ) {
    throw new Error('Refusing to run seed in production');
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin ERP Fiscal',
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          jobTitle: 'Administrador da plataforma',
          department: 'Operacoes',
          locale: 'pt-BR',
          timezone: 'America/Sao_Paulo',
        },
      },
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { cnpj: '11222333000181' },
    update: {},
    create: {
      legalName: 'Atlas Consultoria Digital LTDA',
      tradeName: 'Atlas ERP',
      cnpj: '11222333000181',
      taxRegime: TenantTaxRegime.SIMPLES_NACIONAL,
      municipalRegistration: '12345678',
      cnae: '6201501',
      serviceTaxCode: '01.05',
      municipalServiceCode: '0105',
      fiscalProvider: FiscalProvider.NFE_IO,
      contactEmail: 'financeiro@atlas.dev',
      contactPhone: '11999990000',
      addressStreet: 'Rua dos Sistemas',
      addressNumber: '100',
      addressComplement: 'Conjunto 42',
      addressNeighborhood: 'Centro',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
      addressCityIbgeCode: '3550308',
      addressZipCode: '01001000',
    },
  });

  await prisma.tenantTitular.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      role: TenantTitularRole.OWNER,
      title: 'Socio administrador',
      ownershipPercentage: 100,
      isLegalRepresentative: true,
      canIssueInvoices: true,
    },
  });

  await prisma.client.upsert({
    where: {
      tenantId_document: {
        tenantId: tenant.id,
        document: '44555666000190',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      createdByUserId: admin.id,
      type: ClientType.COMPANY,
      name: 'Cliente Demonstracao Servicos LTDA',
      tradeName: 'Cliente Demo',
      document: '44555666000190',
      email: 'contas@clientedemo.dev',
      phone: '1133334444',
      municipalRegistration: '99887766',
      addressStreet: 'Avenida do Tomador',
      addressNumber: '250',
      addressNeighborhood: 'Bela Vista',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
      addressZipCode: '01310000',
      notes: 'Cliente seed para testar preenchimento automatico de NFS-e.',
    },
  });

  const secret = process.env.ONBOARDING_JWT_SECRET;
  if (secret) {
    const token = sign({ purpose: 'tenant_onboarding' }, secret, {
      expiresIn: '7d',
      subject: admin.id,
    });
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    console.log('\n--- Onboarding URL (valido por 7 dias) ---');
    console.log(`${webOrigin}/onboarding?token=${encodeURIComponent(token)}`);
    console.log('------------------------------------------\n');
  } else {
    console.warn('\nAVISO: ONBOARDING_JWT_SECRET nao configurado. URL de onboarding nao gerada.\n');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
