import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

@Injectable()
export class TenantSecretCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(plainText: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.getKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  decrypt(payload: string) {
    const [version, iv, authTag, encrypted] = payload.split(':');
    if (version !== VERSION || !iv || !authTag || !encrypted) {
      throw new InternalServerErrorException(
        'Invalid encrypted secret payload',
      );
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.getKey(),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getKey() {
    const secret = this.configService.get<string>(
      'FISCAL_CREDENTIALS_ENCRYPTION_KEY',
    );
    if (!secret || secret.length < 32) {
      throw new InternalServerErrorException(
        'FISCAL_CREDENTIALS_ENCRYPTION_KEY must have at least 32 characters',
      );
    }

    return createHash('sha256').update(secret).digest();
  }
}
