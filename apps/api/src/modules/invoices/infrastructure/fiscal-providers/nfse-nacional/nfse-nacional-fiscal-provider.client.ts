import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiscalProvider } from '@prisma/client';
import { gzipSync } from 'node:zlib';
import { request as httpsRequest } from 'node:https';
import {
  FiscalCancelInput,
  FiscalCancelResult,
  FiscalCredentialMaterial,
  FiscalIssueInput,
  FiscalIssueResult,
  FiscalProviderClient,
  FiscalStatusInput,
  FiscalStatusResult,
} from '../fiscal-provider.types';
import {
  DpsBuilder,
  NfseNacionalEnvironment,
} from './dps.builder';
import { DpsSigner } from './dps.signer';

type NfseNacionalMode = 'mock' | 'producao_restrita' | 'producao';

type AdnNfseResponse = {
  chaveAcesso?: string;
  nfseXmlGZipB64?: string;
  [key: string]: unknown;
};

/**
 * Adapter para o Sistema Nacional NFS-e (Receita Federal / SEFIN-ADN).
 *
 * Fluxo real: monta a DPS -> assina (XMLDSIG) -> GZip+Base64 -> POST /nfse via
 * mTLS com o certificado A1 do tenant -> recebe a chave de acesso (50 digitos)
 * e o XML autorizado.
 *
 * No modo `mock` o mesmo caminho de montagem da DPS roda, mas a assinatura e a
 * chamada de rede sao substituidas por uma resposta fiel ao contrato. Isso
 * permite demonstrar a emissao nativa ponta a ponta sem certificado pago e sem
 * homologacao, e ativar a emissao real apenas trocando `NFSE_NACIONAL_MODE` e
 * configurando o certificado no tenant.
 */
export class NfseNacionalFiscalProviderClient implements FiscalProviderClient {
  private readonly builder = new DpsBuilder();
  private readonly signer = new DpsSigner();

  constructor(private readonly configService: ConfigService) {}

  async issueServiceInvoice(
    input: FiscalIssueInput,
  ): Promise<FiscalIssueResult> {
    const mode = this.resolveMode();
    const environment: NfseNacionalEnvironment =
      mode === 'producao' ? 'producao' : 'producao_restrita';

    const dps = this.builder.build({
      tenant: input.tenant,
      invoice: input.invoice,
      environment,
    });

    if (mode === 'mock') {
      return this.issueMock(dps.xml, dps.dpsId, input);
    }

    return this.issueReal(dps.xml, dps.dpsId, input, mode);
  }

  private issueMock(
    dpsXml: string,
    dpsId: string,
    input: FiscalIssueInput,
  ): FiscalIssueResult {
    const accessKey = this.buildMockAccessKey(input);
    const authorizedXml = this.wrapMockNfse(dpsXml, accessKey);

    return {
      provider: FiscalProvider.NFSE_NACIONAL,
      status: 'AUTHORIZED',
      providerExternalId: accessKey,
      accessKey,
      xml: authorizedXml,
      verificationCode: accessKey.slice(-9),
      rpsNumber: dpsId.slice(-15),
      providerPayload: { mode: 'mock', dpsId, dpsXml },
      providerResponse: {
        mode: 'mock',
        chaveAcesso: accessKey,
        nfseXml: authorizedXml,
        message:
          'NFS-e simulada localmente. Para emissao real, configure certificado A1 e NFSE_NACIONAL_MODE=producao_restrita.',
      },
    };
  }

  private async issueReal(
    dpsXml: string,
    dpsId: string,
    input: FiscalIssueInput,
    mode: NfseNacionalMode,
  ): Promise<FiscalIssueResult> {
    const pfxBase64 = input.credential?.certificatePfxBase64;
    const password = input.credential?.certificatePassword;

    if (!pfxBase64 || !password) {
      throw new BadRequestException(
        'NFS-e Nacional em modo real exige certificado A1 (PFX) e senha configurados no tenant.',
      );
    }

    const signedXml = this.signer.sign({
      xml: dpsXml,
      referenceId: dpsId,
      certificate: { pfxBase64, password },
    });

    const dpsGZipB64 = gzipSync(Buffer.from(signedXml, 'utf-8')).toString(
      'base64',
    );

    const response = await this.adnRequest({
      method: 'POST',
      path: '/nfse',
      body: { dpsXmlGZipB64: dpsGZipB64 },
      pfx: Buffer.from(pfxBase64, 'base64'),
      passphrase: password,
    });

    if (!response.ok) {
      throw new BadRequestException({
        message: 'NFS-e Nacional rejeitou a DPS',
        environment: mode,
        providerResponse: response.body,
      });
    }

    const body = response.body as AdnNfseResponse;
    const accessKey = body.chaveAcesso ?? '';

    return {
      provider: FiscalProvider.NFSE_NACIONAL,
      status: 'AUTHORIZED',
      providerExternalId: accessKey || dpsId,
      accessKey: accessKey || undefined,
      xml: body.nfseXmlGZipB64
        ? this.gunzipB64(body.nfseXmlGZipB64)
        : undefined,
      verificationCode: accessKey ? accessKey.slice(-9) : undefined,
      rpsNumber: dpsId.slice(-15),
      providerPayload: { dpsId, dpsGZipB64 },
      providerResponse: body,
    };
  }

  async cancelServiceInvoice(
    input: FiscalCancelInput,
  ): Promise<FiscalCancelResult> {
    const mode = this.resolveMode();

    if (mode === 'mock') {
      const eventId = `EVT${Date.now()}`;
      return {
        status: 'CANCELLED',
        eventId,
        providerPayload: {
          mode: 'mock',
          chaveAcesso: input.accessKey,
          motivo: input.reason,
        },
        providerResponse: {
          mode: 'mock',
          eventId,
          message:
            'Cancelamento simulado localmente. Em producao gera evento assinado em POST /nfse/{chave}/eventos.',
        },
      };
    }

    const cert = this.requireCertificate(input.credential);
    const eventXml = this.buildCancelEventXml(input);
    const signedXml = this.signer.sign({
      xml: eventXml.xml,
      referenceId: eventXml.eventId,
      certificate: cert,
    });
    const eventGZipB64 = gzipSync(Buffer.from(signedXml, 'utf-8')).toString(
      'base64',
    );

    const response = await this.adnRequest({
      method: 'POST',
      path: `/nfse/${encodeURIComponent(input.accessKey)}/eventos`,
      body: { eventoXmlGZipB64: eventGZipB64 },
      pfx: Buffer.from(cert.pfxBase64, 'base64'),
      passphrase: cert.password,
    });

    if (!response.ok) {
      throw new BadRequestException({
        message: 'NFS-e Nacional rejeitou o cancelamento',
        providerResponse: response.body,
      });
    }

    return {
      status: 'CANCELLED',
      eventId: eventXml.eventId,
      providerPayload: { eventId: eventXml.eventId, eventGZipB64 },
      providerResponse: response.body,
    };
  }

  async getServiceInvoiceStatus(
    input: FiscalStatusInput,
  ): Promise<FiscalStatusResult> {
    const mode = this.resolveMode();

    if (mode === 'mock') {
      return {
        status: 'AUTHORIZED',
        providerResponse: {
          mode: 'mock',
          chaveAcesso: input.accessKey,
          situacao: 'AUTORIZADA',
        },
      };
    }

    const cert = this.requireCertificate(input.credential);
    const response = await this.adnRequest({
      method: 'GET',
      path: `/nfse/${encodeURIComponent(input.accessKey)}`,
      pfx: Buffer.from(cert.pfxBase64, 'base64'),
      passphrase: cert.password,
    });

    if (!response.ok) {
      throw new BadRequestException({
        message: 'NFS-e Nacional nao retornou a consulta',
        providerResponse: response.body,
      });
    }

    const body = response.body as AdnNfseResponse;
    return {
      status: 'AUTHORIZED',
      xml: body.nfseXmlGZipB64 ? this.gunzipB64(body.nfseXmlGZipB64) : undefined,
      providerResponse: body,
    };
  }

  private requireCertificate(
    credential?: FiscalCredentialMaterial,
  ): { pfxBase64: string; password: string } {
    const pfxBase64 = credential?.certificatePfxBase64;
    const password = credential?.certificatePassword;
    if (!pfxBase64 || !password) {
      throw new BadRequestException(
        'NFS-e Nacional em modo real exige certificado A1 (PFX) e senha configurados no tenant.',
      );
    }
    return { pfxBase64, password };
  }

  /**
   * Evento de cancelamento (e101101) no padrao nacional. Estrutura minima; em
   * producao deve seguir o XSD oficial de eventos da NFS-e e ser assinado.
   */
  private buildCancelEventXml(input: FiscalCancelInput): {
    eventId: string;
    xml: string;
  } {
    const eventId = `EVT${input.accessKey}01`;
    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">`,
      `<infPedReg Id="${eventId}">`,
      `<tpAmb>${this.resolveMode() === 'producao' ? '1' : '2'}</tpAmb>`,
      `<chNFSe>${this.onlyDigits(input.accessKey)}</chNFSe>`,
      `<dhEvento>${new Date().toISOString()}</dhEvento>`,
      `<tpEvento>101101</tpEvento>`,
      `<e101101><xMotivo>${this.escape(input.reason)}</xMotivo></e101101>`,
      `</infPedReg>`,
      `</pedRegEvento>`,
    ].join('');
    return { eventId, xml };
  }

  private adnRequest(args: {
    method: 'GET' | 'POST';
    path: string;
    body?: unknown;
    pfx: Buffer;
    passphrase: string;
  }): Promise<{ ok: boolean; status: number; body: unknown }> {
    const baseUrl =
      this.configService.get<string>('NFSE_NACIONAL_BASE_URL') ??
      'https://sefin.producaorestrita.nfse.gov.br/SefinNacional';
    const url = new URL(`${baseUrl}${args.path}`);
    const payload =
      args.body !== undefined
        ? Buffer.from(JSON.stringify(args.body), 'utf-8')
        : undefined;

    return new Promise((resolve, reject) => {
      const req = httpsRequest(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + url.search,
          method: args.method,
          // mTLS: o certificado A1 do tenant e a credencial de autenticacao.
          pfx: args.pfx,
          passphrase: args.passphrase,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': payload.length } : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8');
            let body: unknown = raw;
            try {
              body = raw ? JSON.parse(raw) : null;
            } catch {
              body = raw;
            }
            const status = res.statusCode ?? 0;
            resolve({ ok: status >= 200 && status < 300, status, body });
          });
        },
      );
      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  private resolveMode(): NfseNacionalMode {
    const raw = (
      this.configService.get<string>('NFSE_NACIONAL_MODE') ?? 'mock'
    ).toLowerCase();
    if (raw === 'producao') return 'producao';
    if (raw === 'producao_restrita' || raw === 'homologacao') {
      return 'producao_restrita';
    }
    return 'mock';
  }

  /**
   * Gera uma chave de acesso de 50 digitos no formato do padrao nacional:
   * cMun(7) + AAMM(4) + tpInsc(1) + inscricao(14) + sequencial/aleatorio + DV.
   */
  private buildMockAccessKey(input: FiscalIssueInput): string {
    const cMun = this.onlyDigits(input.tenant.addressCityIbgeCode).padStart(
      7,
      '0',
    );
    const now = new Date();
    const aa = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const tpInsc = '2';
    const insc = this.onlyDigits(input.tenant.cnpj).padStart(14, '0');
    let key = `${cMun}${aa}${mm}${tpInsc}${insc}`;
    while (key.length < 49) {
      key += Math.floor(Math.random() * 10).toString();
    }
    key = key.slice(0, 49);
    return key + this.mod11CheckDigit(key);
  }

  private wrapMockNfse(dpsXml: string, accessKey: string): string {
    const inner = dpsXml.replace(/^<\?xml[^>]*\?>/, '');
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">` +
      `<infNFSe Id="NFS${accessKey}"><chNFSe>${accessKey}</chNFSe>${inner}</infNFSe>` +
      `</NFSe>`
    );
  }

  private gunzipB64(value: string): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { gunzipSync } = require('node:zlib') as typeof import('node:zlib');
    return gunzipSync(Buffer.from(value, 'base64')).toString('utf-8');
  }

  private mod11CheckDigit(value: string): string {
    let weight = 2;
    let sum = 0;
    for (let i = value.length - 1; i >= 0; i--) {
      sum += Number(value[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const rest = sum % 11;
    const dv = rest === 0 || rest === 1 ? 0 : 11 - rest;
    return String(dv);
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
