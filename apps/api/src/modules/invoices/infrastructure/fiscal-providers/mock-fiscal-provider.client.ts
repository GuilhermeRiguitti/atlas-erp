import { FiscalProvider } from '@prisma/client';
import {
  FiscalIssueInput,
  FiscalIssueResult,
  FiscalProviderClient,
} from './fiscal-provider.types';

export class MockFiscalProviderClient implements FiscalProviderClient {
  issueServiceInvoice(input: FiscalIssueInput): Promise<FiscalIssueResult> {
    const providerExternalId = `mock_${Date.now()}`;

    return Promise.resolve({
      provider: FiscalProvider.MOCK,
      status: 'AUTHORIZED',
      providerExternalId,
      verificationCode: providerExternalId.slice(-8).toUpperCase(),
      rpsNumber: providerExternalId.slice(-6),
      providerPayload: input,
      providerResponse: {
        id: providerExternalId,
        message: 'Mock fiscal provider authorized the service invoice.',
      },
    });
  }
}
