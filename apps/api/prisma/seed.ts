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

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('portfolio123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@atlas.dev' },
    update: {},
    create: {
      name: 'Ada Portfolio',
      email: 'admin@atlas.dev',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          headline: 'Product-minded Full Stack Engineer',
          bio: 'Construo produtos internos com foco em clareza operacional, segurança e velocidade de entrega.',
          location: 'Sao Paulo, BR',
          seniority: 'Senior',
          skills: 'NestJS, Next.js, Prisma, PostgreSQL, Design Systems',
          availability: 'Open to portfolio reviews',
          website: 'https://portfolio.example',
          github: 'https://github.com/example',
          linkedin: 'https://linkedin.com/in/example',
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
      fiscalProvider: FiscalProvider.MOCK,
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
