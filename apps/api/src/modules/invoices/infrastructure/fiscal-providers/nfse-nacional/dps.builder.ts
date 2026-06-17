import { Tenant } from '@prisma/client';
import { ResolvedServiceInvoiceInput } from '../fiscal-provider.types';

export type NfseNacionalEnvironment = 'producao' | 'producao_restrita';

export type BuiltDps = {
  /** Id do elemento infDPS, usado tambem como referencia na assinatura XMLDSIG. */
  dpsId: string;
  /** Numero sequencial da DPS gerado para esta emissao. */
  dpsNumber: string;
  /** Serie da DPS. */
  series: string;
  /** XML da DPS ainda sem assinatura. */
  xml: string;
};

/**
 * Monta a DPS (Declaracao de Prestacao de Servicos) no padrao do Sistema
 * Nacional NFS-e (Receita Federal). O XML segue o namespace oficial e e a
 * base que, apos assinatura XMLDSIG, e enviada ao SEFIN/ADN.
 *
 * A DPS e o documento que o contribuinte gera; a prefeitura/ADN o transforma
 * na NFS-e e devolve a chave de acesso de 50 digitos.
 */
export class DpsBuilder {
  private static readonly NAMESPACE =
    'http://www.sped.fazenda.gov.br/nfse';
  private static readonly LAYOUT_VERSION = '1.00';

  build(input: {
    tenant: Tenant;
    invoice: ResolvedServiceInvoiceInput;
    environment: NfseNacionalEnvironment;
    dpsNumber?: string;
    series?: string;
    emittedAt?: Date;
  }): BuiltDps {
    const { tenant, invoice, environment } = input;
    const emittedAt = input.emittedAt ?? new Date();
    const series = input.series ?? '00001';
    const dpsNumber = input.dpsNumber ?? this.generateDpsNumber(emittedAt);

    const tpAmb = environment === 'producao' ? '1' : '2';
    const cMun = this.onlyDigits(tenant.addressCityIbgeCode);
    const emitDoc = this.onlyDigits(tenant.cnpj);
    const dpsId = this.buildDpsId(cMun, emitDoc, series, dpsNumber);

    const issRate = invoice.issRate ?? 0;
    const servicesAmount = this.money(invoice.amount);
    const deductions = this.money(invoice.deductions ?? 0);

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<DPS xmlns="${DpsBuilder.NAMESPACE}" versao="${DpsBuilder.LAYOUT_VERSION}">`,
      `<infDPS Id="${dpsId}">`,
      `<tpAmb>${tpAmb}</tpAmb>`,
      `<dhEmi>${emittedAt.toISOString()}</dhEmi>`,
      `<verAplic>atlas-erp-1.0</verAplic>`,
      `<serie>${series}</serie>`,
      `<nDPS>${dpsNumber}</nDPS>`,
      `<dCompet>${this.competence(emittedAt)}</dCompet>`,
      `<tpEmit>1</tpEmit>`,
      `<cLocEmi>${cMun}</cLocEmi>`,
      this.prestador(tenant),
      this.tomador(invoice),
      this.servico(invoice, cMun, servicesAmount, deductions, issRate),
      `</infDPS>`,
      `</DPS>`,
    ].join('');

    return { dpsId, dpsNumber, series, xml };
  }

  private prestador(tenant: Tenant): string {
    return [
      `<prest>`,
      `<CNPJ>${this.onlyDigits(tenant.cnpj)}</CNPJ>`,
      tenant.municipalRegistration
        ? `<IM>${this.onlyDigits(tenant.municipalRegistration)}</IM>`
        : '',
      `<xNome>${this.escape(tenant.legalName)}</xNome>`,
      `<regTrib><opSimpNac>${this.simplesNacionalCode(tenant)}</opSimpNac></regTrib>`,
      `</prest>`,
    ].join('');
  }

  private tomador(invoice: ResolvedServiceInvoiceInput): string {
    const doc = this.onlyDigits(invoice.borrowerDocument);
    const docTag = doc.length > 11 ? `<CNPJ>${doc}</CNPJ>` : `<CPF>${doc}</CPF>`;
    return [
      `<toma>`,
      docTag,
      `<xNome>${this.escape(invoice.borrowerName)}</xNome>`,
      invoice.borrowerEmail
        ? `<email>${this.escape(invoice.borrowerEmail)}</email>`
        : '',
      this.tomadorEndereco(invoice),
      `</toma>`,
    ].join('');
  }

  private tomadorEndereco(invoice: ResolvedServiceInvoiceInput): string {
    if (!invoice.borrowerStreet && !invoice.borrowerCity) {
      return '';
    }
    return [
      `<end>`,
      invoice.borrowerStreet
        ? `<xLgr>${this.escape(invoice.borrowerStreet)}</xLgr>`
        : '',
      invoice.borrowerNumber
        ? `<nro>${this.escape(invoice.borrowerNumber)}</nro>`
        : '',
      invoice.borrowerNeighborhood
        ? `<xBairro>${this.escape(invoice.borrowerNeighborhood)}</xBairro>`
        : '',
      invoice.borrowerState
        ? `<UF>${this.escape(invoice.borrowerState.toUpperCase())}</UF>`
        : '',
      invoice.borrowerZipCode
        ? `<CEP>${this.onlyDigits(invoice.borrowerZipCode)}</CEP>`
        : '',
      `</end>`,
    ].join('');
  }

  private servico(
    invoice: ResolvedServiceInvoiceInput,
    cMun: string,
    servicesAmount: string,
    deductions: string,
    issRate: number,
  ): string {
    return [
      `<serv>`,
      `<locPrest><cLocPrestacao>${cMun}</cLocPrestacao></locPrest>`,
      `<cServ>`,
      invoice.serviceCode
        ? `<cTribNac>${this.escape(invoice.serviceCode)}</cTribNac>`
        : '',
      invoice.municipalTaxCode
        ? `<cTribMun>${this.escape(invoice.municipalTaxCode)}</cTribMun>`
        : '',
      `<xDescServ>${this.escape(invoice.serviceDescription)}</xDescServ>`,
      `</cServ>`,
      `</serv>`,
      `<valores>`,
      `<vServPrest><vServ>${servicesAmount}</vServ></vServPrest>`,
      `<vDescCondIncond><vDescIncond>${deductions}</vDescIncond></vDescCondIncond>`,
      `<trib><tribMun><pAliq>${this.rate(issRate)}</pAliq></tribMun></trib>`,
      `</valores>`,
    ].join('');
  }

  /**
   * Id do infDPS: "DPS" + cMun(7) + tpInsc(1) + nInsc(14) + serie(5) + nDPS(15).
   * tpInsc = 2 para CNPJ.
   */
  private buildDpsId(
    cMun: string,
    cnpj: string,
    series: string,
    dpsNumber: string,
  ): string {
    return (
      'DPS' +
      cMun.padStart(7, '0') +
      '2' +
      cnpj.padStart(14, '0') +
      series.padStart(5, '0') +
      dpsNumber.padStart(15, '0')
    );
  }

  private generateDpsNumber(emittedAt: Date): string {
    // Sequencial simples baseado no timestamp; em producao deve vir de um
    // contador transacional por tenant/serie para garantir unicidade.
    return String(emittedAt.getTime()).slice(-15);
  }

  private simplesNacionalCode(tenant: Tenant): string {
    // 1 = optante (MEI/Simples), 2 = nao optante. MEI e Simples sao optantes.
    return tenant.taxRegime === 'MEI' || tenant.taxRegime === 'SIMPLES_NACIONAL'
      ? '1'
      : '2';
  }

  private competence(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private money(value: number): string {
    return value.toFixed(2);
  }

  private rate(value: number): string {
    return value.toFixed(4);
  }

  private onlyDigits(value: string | null | undefined): string {
    return (value ?? '').replace(/\D/g, '');
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
