import { BadRequestException } from '@nestjs/common';

export type CertificateMaterial = {
  pfxBase64: string;
  password: string;
};

/**
 * Assina a DPS com XMLDSIG enveloped usando o certificado A1 ICP-Brasil do
 * tenant. Exigido pelo SEFIN/ADN antes do envio.
 *
 * As bibliotecas `node-forge` (leitura do PFX) e `xml-crypto` (assinatura) sao
 * carregadas de forma preguicosa: o modo `mock` nunca chega aqui, entao o
 * projeto roda e demonstra o fluxo completo mesmo sem certificado nem essas
 * dependencias instaladas.
 */
export class DpsSigner {
  sign(input: {
    xml: string;
    referenceId: string;
    certificate: CertificateMaterial;
  }): string {
    const { privateKeyPem, certificatePem } = this.extractFromPfx(
      input.certificate,
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SignedXml } = require('xml-crypto') as typeof import('xml-crypto');

    const sig = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certificatePem,
      signatureAlgorithm:
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      canonicalizationAlgorithm:
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    });

    sig.addReference({
      xpath: `//*[@Id='${input.referenceId}']`,
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      ],
    });

    sig.computeSignature(input.xml, {
      location: { reference: `//*[local-name(.)='infDPS']`, action: 'after' },
    });

    return sig.getSignedXml();
  }

  private extractFromPfx(certificate: CertificateMaterial): {
    privateKeyPem: string;
    certificatePem: string;
  } {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const forge = require('node-forge') as typeof import('node-forge');

    let p12Der: string;
    try {
      p12Der = forge.util.decode64(certificate.pfxBase64);
    } catch {
      throw new BadRequestException('Certificado PFX invalido (base64).');
    }

    let p12Asn1;
    let p12;
    try {
      p12Asn1 = forge.asn1.fromDer(p12Der);
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certificate.password);
    } catch {
      throw new BadRequestException(
        'Nao foi possivel abrir o certificado: senha incorreta ou PFX corrompido.',
      );
    }

    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];

    if (!keyBag?.key || !certBag?.cert) {
      throw new BadRequestException(
        'Certificado nao contem chave privada e certificado validos.',
      );
    }

    return {
      privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
      certificatePem: forge.pki.certificateToPem(certBag.cert),
    };
  }
}
