import { BadRequestException } from '@nestjs/common';
import * as forge from 'node-forge';
import { CertificateValidatorService } from './certificate-validator.service';

function makePfx(options: {
  cnpj: string;
  password: string;
  notBefore?: Date;
  notAfter?: Date;
}): string {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore =
    options.notBefore ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
  cert.validity.notAfter =
    options.notAfter ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const attrs = [{ name: 'commonName', value: `EMPRESA TESTE:${options.cnpj}` }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert],
    options.password,
    { algorithm: '3des' },
  );
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  return forge.util.encode64(der);
}

describe('CertificateValidatorService', () => {
  const service = new CertificateValidatorService();
  const cnpj = '12345678000199';
  const password = 'senha-cert';

  it('aceita certificado valido com CNPJ correspondente ao tenant', () => {
    const pfxBase64 = makePfx({ cnpj, password });
    const result = service.validate({
      pfxBase64,
      password,
      expectedCnpj: '12.345.678/0001-99',
    });
    expect(result.cnpj).toBe(cnpj);
    expect(result.cnpjVerified).toBe(true);
  });

  it('rejeita senha incorreta', () => {
    const pfxBase64 = makePfx({ cnpj, password });
    expect(() =>
      service.validate({ pfxBase64, password: 'errada', expectedCnpj: cnpj }),
    ).toThrow(BadRequestException);
  });

  it('rejeita CNPJ que nao corresponde ao tenant', () => {
    const pfxBase64 = makePfx({ cnpj, password });
    expect(() =>
      service.validate({
        pfxBase64,
        password,
        expectedCnpj: '99999999000100',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita certificado vencido', () => {
    const pfxBase64 = makePfx({
      cnpj,
      password,
      notBefore: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
      notAfter: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    expect(() =>
      service.validate({ pfxBase64, password, expectedCnpj: cnpj }),
    ).toThrow(BadRequestException);
  });
});
