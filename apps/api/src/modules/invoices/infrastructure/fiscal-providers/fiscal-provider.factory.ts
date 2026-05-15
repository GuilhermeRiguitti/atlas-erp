import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiscalProvider } from '@prisma/client';
import { FiscalProviderClient } from './fiscal-provider.types';
import { MockFiscalProviderClient } from './mock-fiscal-provider.client';
import { NfeIoFiscalProviderClient } from './nfe-io-fiscal-provider.client';

@Injectable()
export class FiscalProviderFactory {
  constructor(private readonly configService: ConfigService) {}

  getClient(provider: FiscalProvider): FiscalProviderClient {
    if (provider === FiscalProvider.NFE_IO) {
      return new NfeIoFiscalProviderClient(this.configService);
    }

    return new MockFiscalProviderClient();
  }
}
