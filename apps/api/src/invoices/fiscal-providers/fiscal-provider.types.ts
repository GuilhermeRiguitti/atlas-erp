import { FiscalProvider, Tenant } from '@prisma/client';
import { CreateServiceInvoiceDto } from '../dto/create-service-invoice.dto';

export type ResolvedServiceInvoiceInput = CreateServiceInvoiceDto & {
  borrowerName: string;
  borrowerDocument: string;
};

export type FiscalIssueInput = {
  tenant: Tenant;
  invoice: ResolvedServiceInvoiceInput;
};

export type FiscalIssueResult = {
  provider: FiscalProvider;
  status: 'PROCESSING' | 'AUTHORIZED';
  providerExternalId: string;
  verificationCode?: string;
  rpsNumber?: string;
  providerPayload: unknown;
  providerResponse: unknown;
};

export interface FiscalProviderClient {
  issueServiceInvoice(input: FiscalIssueInput): Promise<FiscalIssueResult>;
}
