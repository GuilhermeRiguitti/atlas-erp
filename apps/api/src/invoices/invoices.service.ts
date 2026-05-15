import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FiscalProvider, ServiceInvoiceStatus } from '@prisma/client';
import { ClientsService } from '../clients/clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto';
import { FiscalProviderFactory } from './fiscal-providers/fiscal-provider.factory';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalProviderFactory: FiscalProviderFactory,
    private readonly clientsService: ClientsService,
  ) {}

  async findAll(tenantId?: string) {
    const invoices = await this.prisma.serviceInvoice.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { tenant: true, issuedBy: true, client: true },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((invoice) => this.serializeInvoice(invoice));
  }

  async issue(dto: CreateServiceInvoiceDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const selectedClient = dto.clientId
      ? await this.clientsService.ensureClientBelongsToTenant(
          dto.clientId,
          dto.tenantId,
        )
      : null;
    const borrowerName = dto.borrowerName ?? selectedClient?.name;
    const borrowerDocument = dto.borrowerDocument ?? selectedClient?.document;

    if (!borrowerName || !borrowerDocument) {
      throw new BadRequestException(
        'Borrower data must be provided or selected from a client',
      );
    }

    const provider =
      dto.provider ?? tenant.fiscalProvider ?? FiscalProvider.MOCK;
    const invoiceInput = {
      ...dto,
      borrowerName,
      borrowerDocument,
      borrowerEmail: dto.borrowerEmail ?? selectedClient?.email ?? undefined,
      borrowerStreet:
        dto.borrowerStreet ?? selectedClient?.addressStreet ?? undefined,
      borrowerNumber:
        dto.borrowerNumber ?? selectedClient?.addressNumber ?? undefined,
      borrowerNeighborhood:
        dto.borrowerNeighborhood ??
        selectedClient?.addressNeighborhood ??
        undefined,
      borrowerCity:
        dto.borrowerCity ?? selectedClient?.addressCity ?? undefined,
      borrowerState:
        dto.borrowerState ?? selectedClient?.addressState ?? undefined,
      borrowerZipCode:
        dto.borrowerZipCode ?? selectedClient?.addressZipCode ?? undefined,
    };
    const fiscalClient = this.fiscalProviderFactory.getClient(provider);
    const fiscalResult = await fiscalClient.issueServiceInvoice({
      tenant,
      invoice: invoiceInput,
    });

    const invoice = await this.prisma.serviceInvoice.create({
      data: {
        tenantId: dto.tenantId,
        clientId: dto.clientId,
        issuedByUserId: dto.issuedByUserId,
        status:
          fiscalResult.status === 'AUTHORIZED'
            ? ServiceInvoiceStatus.AUTHORIZED
            : ServiceInvoiceStatus.PROCESSING,
        provider: fiscalResult.provider,
        providerExternalId: fiscalResult.providerExternalId,
        verificationCode: fiscalResult.verificationCode,
        rpsNumber: fiscalResult.rpsNumber,
        serviceDescription: dto.serviceDescription,
        serviceCode: dto.serviceCode,
        cnaeCode: dto.cnaeCode,
        municipalTaxCode: dto.municipalTaxCode,
        borrowerName: invoiceInput.borrowerName,
        borrowerDocument: invoiceInput.borrowerDocument.replace(/\D/g, ''),
        borrowerEmail: invoiceInput.borrowerEmail,
        borrowerStreet: invoiceInput.borrowerStreet,
        borrowerNumber: invoiceInput.borrowerNumber,
        borrowerNeighborhood: invoiceInput.borrowerNeighborhood,
        borrowerCity: invoiceInput.borrowerCity,
        borrowerState: invoiceInput.borrowerState?.toUpperCase(),
        borrowerZipCode: invoiceInput.borrowerZipCode?.replace(/\D/g, ''),
        amount: dto.amount,
        deductions: dto.deductions ?? 0,
        issRate: dto.issRate,
        notes: dto.notes,
        providerPayload: fiscalResult.providerPayload as object,
        providerResponse: fiscalResult.providerResponse as object,
        issuedAt: fiscalResult.status === 'AUTHORIZED' ? new Date() : undefined,
      },
      include: { tenant: true, issuedBy: true, client: true },
    });

    return this.serializeInvoice(invoice);
  }

  private serializeInvoice(invoice: {
    amount: { toString(): string };
    deductions: { toString(): string };
    issRate?: { toString(): string } | null;
    [key: string]: unknown;
  }) {
    return {
      ...invoice,
      amount: Number(invoice.amount),
      deductions: Number(invoice.deductions),
      issRate: invoice.issRate ? Number(invoice.issRate) : null,
    };
  }
}
