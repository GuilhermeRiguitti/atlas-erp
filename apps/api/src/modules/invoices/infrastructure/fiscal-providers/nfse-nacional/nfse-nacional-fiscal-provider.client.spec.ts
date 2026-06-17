import { ConfigService } from '@nestjs/config';
import { FiscalProvider, Tenant } from '@prisma/client';
import { NfseNacionalFiscalProviderClient } from './nfse-nacional-fiscal-provider.client';
import { DpsBuilder } from './dps.builder';
import {
  FiscalIssueInput,
  ResolvedServiceInvoiceInput,
} from '../fiscal-provider.types';

function fakeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant_1',
    legalName: 'Servicos Muriae LTDA',
    tradeName: 'Servicos Muriae',
    cnpj: '12345678000199',
    status: 'ACTIVE',
    taxRegime: 'MEI',
    municipalRegistration: '123456',
    stateRegistration: null,
    cnae: '6201500',
    serviceTaxCode: '0107',
    municipalServiceCode: '0107',
    fiscalProvider: FiscalProvider.NFSE_NACIONAL,
    fiscalProviderCompanyId: null,
    contactEmail: 'contato@empresa.dev',
    contactPhone: null,
    addressStreet: 'Rua A',
    addressNumber: '100',
    addressComplement: null,
    addressNeighborhood: 'Centro',
    addressCity: 'Muriae',
    addressState: 'MG',
    addressCityIbgeCode: '3143906',
    addressZipCode: '36880000',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Tenant;
}

function fakeInvoice(): ResolvedServiceInvoiceInput {
  return {
    tenantId: 'tenant_1',
    serviceDescription: 'Desenvolvimento de software sob demanda',
    serviceCode: '0107',
    amount: 1500.5,
    deductions: 0,
    issRate: 0.02,
    borrowerName: 'Cliente Exemplo LTDA',
    borrowerDocument: '98765432000188',
    borrowerEmail: 'cliente@exemplo.dev',
    borrowerStreet: 'Av B',
    borrowerNumber: '200',
    borrowerNeighborhood: 'Bairro',
    borrowerCity: 'Muriae',
    borrowerState: 'mg',
    borrowerZipCode: '36880000',
  } as ResolvedServiceInvoiceInput;
}

function mockConfig(mode?: string): ConfigService {
  return {
    get: (key: string) => (key === 'NFSE_NACIONAL_MODE' ? mode : undefined),
  } as unknown as ConfigService;
}

describe('NfseNacionalFiscalProviderClient (mock mode)', () => {
  const input: FiscalIssueInput = {
    tenant: fakeTenant(),
    invoice: fakeInvoice(),
  };

  it('emite NFS-e simulada com chave de acesso de 50 digitos', async () => {
    const client = new NfseNacionalFiscalProviderClient(mockConfig('mock'));
    const result = await client.issueServiceInvoice(input);

    expect(result.provider).toBe(FiscalProvider.NFSE_NACIONAL);
    expect(result.status).toBe('AUTHORIZED');
    expect(result.accessKey).toMatch(/^\d{50}$/);
    expect(result.providerExternalId).toBe(result.accessKey);
    expect(result.xml).toContain('<chNFSe>');
    expect(result.xml).toContain(result.accessKey as string);
  });

  it('usa modo mock por padrao quando NFSE_NACIONAL_MODE nao esta definido', async () => {
    const client = new NfseNacionalFiscalProviderClient(mockConfig(undefined));
    const result = await client.issueServiceInvoice(input);
    expect(result.status).toBe('AUTHORIZED');
  });

  it('inicia a chave de acesso com o codigo IBGE do municipio', async () => {
    const client = new NfseNacionalFiscalProviderClient(mockConfig('mock'));
    const result = await client.issueServiceInvoice(input);
    expect(result.accessKey?.startsWith('3143906')).toBe(true);
  });

  it('cancela uma NFS-e simulada sem exigir certificado', async () => {
    const client = new NfseNacionalFiscalProviderClient(mockConfig('mock'));
    const result = await client.cancelServiceInvoice({
      tenant: fakeTenant(),
      accessKey: '3143906'.padEnd(50, '1'),
      reason: 'Emitida em duplicidade',
    });
    expect(result.status).toBe('CANCELLED');
    expect(result.eventId).toBeDefined();
  });

  it('consulta status de uma NFS-e simulada sem exigir certificado', async () => {
    const client = new NfseNacionalFiscalProviderClient(mockConfig('mock'));
    const result = await client.getServiceInvoiceStatus({
      tenant: fakeTenant(),
      accessKey: '3143906'.padEnd(50, '1'),
    });
    expect(result.status).toBe('AUTHORIZED');
  });
});

describe('DpsBuilder', () => {
  it('monta DPS com namespace nacional e dados do prestador/tomador', () => {
    const dps = new DpsBuilder().build({
      tenant: fakeTenant(),
      invoice: fakeInvoice(),
      environment: 'producao_restrita',
    });

    expect(dps.xml).toContain('http://www.sped.fazenda.gov.br/nfse');
    expect(dps.dpsId.startsWith('DPS')).toBe(true);
    expect(dps.xml).toContain('<tpAmb>2</tpAmb>');
    expect(dps.xml).toContain('<CNPJ>12345678000199</CNPJ>');
    expect(dps.xml).toContain('<CNPJ>98765432000188</CNPJ>');
    expect(dps.xml).toContain('<vServ>1500.50</vServ>');
  });

  it('usa tag CPF quando o tomador e pessoa fisica', () => {
    const invoice = fakeInvoice();
    invoice.borrowerDocument = '12345678901';
    const dps = new DpsBuilder().build({
      tenant: fakeTenant(),
      invoice,
      environment: 'producao',
    });
    expect(dps.xml).toContain('<CPF>12345678901</CPF>');
    expect(dps.xml).toContain('<tpAmb>1</tpAmb>');
  });
});
