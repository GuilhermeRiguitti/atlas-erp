import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiscalProvider } from '@prisma/client';
import {
  FiscalIssueInput,
  FiscalIssueResult,
  FiscalProviderClient,
} from './fiscal-provider.types';

type NfeIoIssueResponse = {
  id?: string;
  serviceInvoiceId?: string;
  externalId?: string;
  verificationCode?: string;
  rpsNumber?: string;
  [key: string]: unknown;
};

export class NfeIoFiscalProviderClient implements FiscalProviderClient {
  constructor(private readonly configService: ConfigService) {}

  async issueServiceInvoice(
    input: FiscalIssueInput,
  ): Promise<FiscalIssueResult> {
    const invoiceKey = this.configService.get<string>('NFEIO_INVOICE_KEY');
    const baseUrl =
      this.configService.get<string>('NFEIO_BASE_URL') ?? 'https://api.nfe.io';

    if (!invoiceKey) {
      throw new BadRequestException('NFEIO_INVOICE_KEY is not configured');
    }

    if (!input.tenant.fiscalProviderCompanyId) {
      throw new BadRequestException(
        'Tenant must have fiscalProviderCompanyId configured for NFE.io',
      );
    }

    const payload = this.buildPayload(input);
    const response = await fetch(
      `${baseUrl}/v2/companies/${input.tenant.fiscalProviderCompanyId}/serviceinvoices`,
      {
        method: 'POST',
        headers: {
          Authorization: invoiceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
    const providerResponse = (await response
      .json()
      .catch(() => null)) as NfeIoIssueResponse | null;

    if (!response.ok) {
      throw new BadRequestException({
        message: 'NFE.io rejected the service invoice request',
        providerResponse,
      });
    }

    return {
      provider: FiscalProvider.NFE_IO,
      status: 'PROCESSING',
      providerExternalId:
        providerResponse?.id ??
        providerResponse?.serviceInvoiceId ??
        providerResponse?.externalId ??
        `nfeio_${Date.now()}`,
      verificationCode: providerResponse?.verificationCode,
      rpsNumber: providerResponse?.rpsNumber,
      providerPayload: payload,
      providerResponse,
    };
  }

  private buildPayload(input: FiscalIssueInput) {
    const { invoice, tenant } = input;

    return {
      borrower: {
        federalTaxNumber: invoice.borrowerDocument,
        name: invoice.borrowerName,
        email: invoice.borrowerEmail,
        address: {
          country: 'BRA',
          postalCode: invoice.borrowerZipCode,
          street: invoice.borrowerStreet,
          number: invoice.borrowerNumber,
          district: invoice.borrowerNeighborhood,
          city: invoice.borrowerCity,
          state: invoice.borrowerState,
        },
      },
      cityServiceCode: invoice.municipalTaxCode ?? tenant.municipalServiceCode,
      federalServiceCode: invoice.serviceCode ?? tenant.serviceTaxCode,
      cnaeCode: invoice.cnaeCode ?? tenant.cnae,
      description: invoice.serviceDescription,
      servicesAmount: invoice.amount,
      deductionsAmount: invoice.deductions ?? 0,
      issRate: invoice.issRate,
      additionalInformation: invoice.notes,
    };
  }
}
