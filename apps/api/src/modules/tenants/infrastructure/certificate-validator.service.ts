import { BadRequestException, Injectable } from '@nestjs/common';

// OID ICP-Brasil que carrega o CNPJ da pessoa juridica em certificados e-CNPJ.
const ICP_BRASIL_CNPJ_OID = '2.16.76.1.3.3';

export type CertificateValidationResult = {
  /** Validade final do certificado. */
  notAfter: Date;
  /** CNPJ extraido do certificado (somente digitos), se identificavel. */
  cnpj: string | null;
  /** Indica se foi possivel confirmar o CNPJ contra o tenant. */
  cnpjVerified: boolean;
};

/**
 * Valida o certificado A1 (PFX) antes de armazena-lo: confirma que abre com a
 * senha, que esta dentro da validade e que o CNPJ pertence ao tenant. Evita
 * subir certificado errado, vencido ou de terceiros.
 *
 * `node-forge` e carregado de forma preguicosa: so e exigido quando um
 * certificado e enviado, mantendo o resto do app livre dessa dependencia.
 */
@Injectable()
export class CertificateValidatorService {
  validate(input: {
    pfxBase64: string;
    password: string;
    expectedCnpj: string;
  }): CertificateValidationResult {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const forge = require('node-forge') as typeof import('node-forge');

    const cert = this.openCertificate(forge, input.pfxBase64, input.password);

    const now = new Date();
    if (cert.validity.notBefore > now) {
      throw new BadRequestException('Certificado ainda nao e valido (vigencia futura).');
    }
    if (cert.validity.notAfter < now) {
      throw new BadRequestException('Certificado esta vencido.');
    }

    const expected = this.onlyDigits(input.expectedCnpj);
    const cnpj = this.extractCnpj(cert);

    if (cnpj && expected && cnpj !== expected) {
      throw new BadRequestException(
        'O CNPJ do certificado nao corresponde ao CNPJ do tenant.',
      );
    }

    return {
      notAfter: cert.validity.notAfter,
      cnpj,
      cnpjVerified: Boolean(cnpj && expected && cnpj === expected),
    };
  }

  private openCertificate(
    forge: typeof import('node-forge'),
    pfxBase64: string,
    password: string,
  ) {
    let p12;
    try {
      const der = forge.util.decode64(pfxBase64);
      const asn1 = forge.asn1.fromDer(der);
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    } catch {
      throw new BadRequestException(
        'Nao foi possivel abrir o certificado: senha incorreta ou PFX invalido.',
      );
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
    if (!cert) {
      throw new BadRequestException('Certificado nao contem um certificado valido.');
    }
    return cert;
  }

  /**
   * Tenta extrair o CNPJ do certificado: primeiro pela extensao OID
   * ICP-Brasil, depois pelo CN do titular (formato "NOME:CNPJ").
   */
  private extractCnpj(cert: import('node-forge').pki.Certificate): string | null {
    const extension = cert.extensions?.find(
      (ext: { id?: string }) => ext.id === ICP_BRASIL_CNPJ_OID,
    ) as { value?: string } | undefined;
    if (extension?.value) {
      const digits = this.onlyDigits(extension.value);
      const match = digits.match(/\d{14}/);
      if (match) {
        return match[0];
      }
    }

    const cn = cert.subject.getField('CN') as { value?: string } | null;
    if (cn?.value) {
      const match = this.onlyDigits(cn.value).match(/\d{14}/);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }
}
