import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiscalProvider } from '@prisma/client';
import { FiscalProviderClient } from './fiscal-provider.types';
import { NfeIoFiscalProviderClient } from './nfe-io-fiscal-provider.client';
import { NfseNacionalFiscalProviderClient } from './nfse-nacional/nfse-nacional-fiscal-provider.client';

@Injectable()
export class FiscalProviderFactory {
  constructor(private readonly configService: ConfigService) {}

  getClient(provider: FiscalProvider): FiscalProviderClient {
    if (provider === FiscalProvider.NFE_IO) {
      return new NfeIoFiscalProviderClient(this.configService);
    }

    if (provider === FiscalProvider.NFSE_NACIONAL) {
      return new NfseNacionalFiscalProviderClient(this.configService);
    }

    throw new BadRequestException(`Unsupported fiscal provider: ${provider}`);
  }
}
