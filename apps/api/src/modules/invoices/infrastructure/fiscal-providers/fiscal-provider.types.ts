import { FiscalProvider, Tenant } from '@prisma/client';
import { CreateServiceInvoiceDto } from '../../application/dto/create-service-invoice.dto';

export type ResolvedServiceInvoiceInput = CreateServiceInvoiceDto & {
  borrowerName: string;
  borrowerDocument: string;
};

export type FiscalCredentialMaterial = {
  provider: FiscalProvider;
  providerCompanyId: string;
  apiKey: string;
  /** PFX (certificado A1 ICP-Brasil) em base64, quando o provider usa mTLS. */
  certificatePfxBase64?: string;
  certificatePassword?: string;
};

export type FiscalIssueInput = {
  tenant: Tenant;
  invoice: ResolvedServiceInvoiceInput;
  credential?: FiscalCredentialMaterial;
};

export type FiscalIssueResult = {
  provider: FiscalProvider;
  status: 'PROCESSING' | 'AUTHORIZED';
  providerExternalId: string;
  verificationCode?: string;
  rpsNumber?: string;
  /** Chave de acesso da NFS-e (50 digitos) no padrao nacional, quando aplicavel. */
  accessKey?: string;
  /** XML autorizado retornado pelo provider, quando disponivel. */
  xml?: string;
  providerPayload: unknown;
  providerResponse: unknown;
};

export type FiscalCancelInput = {
  tenant: Tenant;
  accessKey: string;
  reason: string;
  credential?: FiscalCredentialMaterial;
};

export type FiscalCancelResult = {
  status: 'CANCELLED';
  eventId?: string;
  providerPayload: unknown;
  providerResponse: unknown;
};

export type FiscalStatusInput = {
  tenant: Tenant;
  accessKey: string;
  credential?: FiscalCredentialMaterial;
};

export type FiscalStatusResult = {
  status: 'PROCESSING' | 'AUTHORIZED' | 'REJECTED' | 'CANCELLED';
  xml?: string;
  providerResponse: unknown;
};

export interface FiscalProviderClient {
  issueServiceInvoice(input: FiscalIssueInput): Promise<FiscalIssueResult>;
  /** Cancela uma NFS-e ja emitida. Opcional: nem todo provider suporta. */
  cancelServiceInvoice?(input: FiscalCancelInput): Promise<FiscalCancelResult>;
  /** Consulta o status atual de uma NFS-e no provider. Opcional. */
  getServiceInvoiceStatus?(
    input: FiscalStatusInput,
  ): Promise<FiscalStatusResult>;
}
