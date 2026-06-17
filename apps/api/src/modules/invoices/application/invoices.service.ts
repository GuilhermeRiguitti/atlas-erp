import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FiscalAuditEventType,
  FiscalProvider,
  Prisma,
  ServiceInvoiceStatus,
} from '@prisma/client';
import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto';
import { CancelServiceInvoiceDto } from './dto/cancel-service-invoice.dto';
import { ClientsService } from '../../clients/application/clients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantFiscalCredentialsService } from '../../tenants/application/tenant-fiscal-credentials.service';
import { FiscalProviderFactory } from '../infrastructure/fiscal-providers/fiscal-provider.factory';
import { ResolvedServiceInvoiceInput } from '../infrastructure/fiscal-providers/fiscal-provider.types';
import { FiscalInvoiceAttemptContext } from './queues/fiscal-invoice-job.types';
import { FiscalInvoiceQueueProducer } from './queues/fiscal-invoice-queue.producer';

type ServiceInvoiceWithRelations = Prisma.ServiceInvoiceGetPayload<{
  include: { tenant: true; issuedBy: true; client: true };
}>;

type AuditClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalProviderFactory: FiscalProviderFactory,
    private readonly clientsService: ClientsService,
    private readonly fiscalCredentialsService: TenantFiscalCredentialsService,
    private readonly fiscalInvoiceQueueProducer: FiscalInvoiceQueueProducer,
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
    const { invoiceInput, provider } = await this.resolveIssueInput(dto);
    const now = new Date();

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceInvoice.create({
        data: {
          tenantId: dto.tenantId,
          clientId: dto.clientId,
          issuedByUserId: dto.issuedByUserId,
          status: ServiceInvoiceStatus.QUEUED,
          provider,
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
          queuedAt: now,
        },
        include: { tenant: true, issuedBy: true, client: true },
      });

      await this.recordAuditEvent(tx, {
        tenantId: created.tenantId,
        serviceInvoiceId: created.id,
        actorUserId: created.issuedByUserId,
        type: FiscalAuditEventType.INVOICE_ISSUE_QUEUED,
        message: 'Service invoice queued for fiscal issuing.',
        metadata: {
          provider,
          source: 'manual',
        },
      });

      return created;
    });

    try {
      await this.fiscalInvoiceQueueProducer.enqueueIssue({
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
      });
    } catch (error) {
      await this.markQueuePublishFailure(invoice, error);
      throw new BadRequestException({
        message: 'Service invoice was saved but could not be queued',
        invoiceId: invoice.id,
      });
    }

    return this.serializeInvoice(invoice);
  }

  async processQueuedInvoice(
    invoiceId: string,
    context: FiscalInvoiceAttemptContext,
  ) {
    const invoice = await this.prisma.serviceInvoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: true, issuedBy: true, client: true },
    });

    if (!invoice) {
      throw new NotFoundException('Service invoice not found');
    }

    if (
      invoice.status === ServiceInvoiceStatus.AUTHORIZED ||
      invoice.status === ServiceInvoiceStatus.REJECTED ||
      invoice.status === ServiceInvoiceStatus.CANCELLED
    ) {
      return this.serializeInvoice(invoice);
    }

    const started = await this.prisma.serviceInvoice.update({
      where: { id: invoice.id },
      data: {
        status: ServiceInvoiceStatus.PROCESSING,
        processingAttempts: { increment: 1 },
        lastAttemptAt: new Date(),
        lastFailureReason: null,
      },
      include: { tenant: true, issuedBy: true, client: true },
    });

    await this.recordAuditEvent(this.prisma, {
      tenantId: started.tenantId,
      serviceInvoiceId: started.id,
      actorUserId: started.issuedByUserId,
      type: FiscalAuditEventType.INVOICE_ISSUE_STARTED,
      message: 'Fiscal worker started service invoice issuing.',
      metadata: {
        attempt: context.attempt,
        maxAttempts: context.maxAttempts,
        provider: started.provider,
      },
    });

    try {
      const fiscalClient = this.fiscalProviderFactory.getClient(
        started.provider,
      );
      const fiscalCredential =
        await this.fiscalCredentialsService.getActiveCredential(
          started.tenantId,
          started.provider,
        );
      const fiscalResult = await fiscalClient.issueServiceInvoice({
        tenant: started.tenant,
        invoice: this.toFiscalProviderInvoiceInput(started),
        credential: fiscalCredential,
      });
      const nextStatus =
        fiscalResult.status === 'AUTHORIZED'
          ? ServiceInvoiceStatus.AUTHORIZED
          : ServiceInvoiceStatus.PROCESSING;

      const updated = await this.prisma.serviceInvoice.update({
        where: { id: started.id },
        data: {
          status: nextStatus,
          provider: fiscalResult.provider,
          providerExternalId: fiscalResult.providerExternalId,
          verificationCode: fiscalResult.verificationCode,
          rpsNumber: fiscalResult.rpsNumber,
          providerPayload:
            fiscalResult.providerPayload as Prisma.InputJsonValue,
          providerResponse:
            fiscalResult.providerResponse as Prisma.InputJsonValue,
          issuedAt:
            nextStatus === ServiceInvoiceStatus.AUTHORIZED
              ? new Date()
              : undefined,
        },
        include: { tenant: true, issuedBy: true, client: true },
      });

      await this.recordAuditEvent(this.prisma, {
        tenantId: updated.tenantId,
        serviceInvoiceId: updated.id,
        actorUserId: updated.issuedByUserId,
        type:
          nextStatus === ServiceInvoiceStatus.AUTHORIZED
            ? FiscalAuditEventType.INVOICE_ISSUE_AUTHORIZED
            : FiscalAuditEventType.INVOICE_ISSUE_PROCESSING,
        message:
          nextStatus === ServiceInvoiceStatus.AUTHORIZED
            ? 'Service invoice authorized by fiscal provider.'
            : 'Service invoice accepted by provider and is processing.',
        metadata: {
          provider: fiscalResult.provider,
          providerExternalId: fiscalResult.providerExternalId,
        },
      });

      return this.serializeInvoice(updated);
    } catch (error) {
      await this.handleIssueFailure(started, error, context);
    }
  }

  async cancel(invoiceId: string, dto: CancelServiceInvoiceDto) {
    const invoice = await this.prisma.serviceInvoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: true, issuedBy: true, client: true },
    });

    if (!invoice) {
      throw new NotFoundException('Service invoice not found');
    }

    if (invoice.status === ServiceInvoiceStatus.CANCELLED) {
      throw new BadRequestException('Service invoice is already cancelled');
    }

    if (
      invoice.status !== ServiceInvoiceStatus.AUTHORIZED &&
      invoice.status !== ServiceInvoiceStatus.PROCESSING
    ) {
      throw new BadRequestException(
        `Only authorized or processing invoices can be cancelled (current: ${invoice.status})`,
      );
    }

    if (!invoice.providerExternalId) {
      throw new BadRequestException(
        'Service invoice has no provider reference to cancel',
      );
    }

    const fiscalClient = this.fiscalProviderFactory.getClient(invoice.provider);
    if (!fiscalClient.cancelServiceInvoice) {
      throw new BadRequestException(
        `Provider ${invoice.provider} does not support cancellation`,
      );
    }

    const credential = await this.fiscalCredentialsService.getActiveCredential(
      invoice.tenantId,
      invoice.provider,
    );

    const result = await fiscalClient.cancelServiceInvoice({
      tenant: invoice.tenant,
      accessKey: invoice.providerExternalId,
      reason: dto.reason,
      credential,
    });

    const updated = await this.prisma.serviceInvoice.update({
      where: { id: invoice.id },
      data: {
        status: ServiceInvoiceStatus.CANCELLED,
        providerResponse: result.providerResponse as Prisma.InputJsonValue,
      },
      include: { tenant: true, issuedBy: true, client: true },
    });

    await this.recordAuditEvent(this.prisma, {
      tenantId: updated.tenantId,
      serviceInvoiceId: updated.id,
      actorUserId: dto.actorUserId ?? updated.issuedByUserId,
      type: FiscalAuditEventType.INVOICE_CANCELLED,
      message: 'Service invoice cancelled.',
      metadata: {
        reason: dto.reason,
        provider: updated.provider,
        eventId: result.eventId,
      },
    });

    return this.serializeInvoice(updated);
  }

  async refreshStatus(invoiceId: string) {
    const invoice = await this.prisma.serviceInvoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: true, issuedBy: true, client: true },
    });

    if (!invoice) {
      throw new NotFoundException('Service invoice not found');
    }

    const fiscalClient = this.fiscalProviderFactory.getClient(invoice.provider);
    if (!fiscalClient.getServiceInvoiceStatus || !invoice.providerExternalId) {
      return this.serializeInvoice(invoice);
    }

    const credential = await this.fiscalCredentialsService.getActiveCredential(
      invoice.tenantId,
      invoice.provider,
    );

    const result = await fiscalClient.getServiceInvoiceStatus({
      tenant: invoice.tenant,
      accessKey: invoice.providerExternalId,
      credential,
    });

    const nextStatus = ServiceInvoiceStatus[result.status];
    if (nextStatus === invoice.status) {
      return this.serializeInvoice(invoice);
    }

    const updated = await this.prisma.serviceInvoice.update({
      where: { id: invoice.id },
      data: {
        status: nextStatus,
        providerResponse: result.providerResponse as Prisma.InputJsonValue,
        issuedAt:
          nextStatus === ServiceInvoiceStatus.AUTHORIZED && !invoice.issuedAt
            ? new Date()
            : undefined,
      },
      include: { tenant: true, issuedBy: true, client: true },
    });

    return this.serializeInvoice(updated);
  }

  private async resolveIssueInput(dto: CreateServiceInvoiceDto) {
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

    const provider = dto.provider ?? tenant.fiscalProvider;
    await this.fiscalCredentialsService.getActiveCredential(
      tenant.id,
      provider,
    );

    return {
      tenant,
      provider,
      invoiceInput: {
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
      },
    };
  }

  private toFiscalProviderInvoiceInput(
    invoice: ServiceInvoiceWithRelations,
  ): ResolvedServiceInvoiceInput {
    return {
      tenantId: invoice.tenantId,
      clientId: invoice.clientId ?? undefined,
      issuedByUserId: invoice.issuedByUserId ?? undefined,
      provider: invoice.provider,
      serviceDescription: invoice.serviceDescription,
      serviceCode: invoice.serviceCode ?? undefined,
      cnaeCode: invoice.cnaeCode ?? undefined,
      municipalTaxCode: invoice.municipalTaxCode ?? undefined,
      borrowerName: invoice.borrowerName,
      borrowerDocument: invoice.borrowerDocument,
      borrowerEmail: invoice.borrowerEmail ?? undefined,
      borrowerStreet: invoice.borrowerStreet ?? undefined,
      borrowerNumber: invoice.borrowerNumber ?? undefined,
      borrowerNeighborhood: invoice.borrowerNeighborhood ?? undefined,
      borrowerCity: invoice.borrowerCity ?? undefined,
      borrowerState: invoice.borrowerState ?? undefined,
      borrowerZipCode: invoice.borrowerZipCode ?? undefined,
      amount: Number(invoice.amount),
      deductions: Number(invoice.deductions),
      issRate: invoice.issRate ? Number(invoice.issRate) : undefined,
      notes: invoice.notes ?? undefined,
    };
  }

  private async handleIssueFailure(
    invoice: ServiceInvoiceWithRelations,
    error: unknown,
    context: FiscalInvoiceAttemptContext,
  ) {
    const message = this.getErrorMessage(error);
    const isPermanentRejection = error instanceof BadRequestException;
    const isFinalAttempt = context.attempt >= context.maxAttempts;
    const status = isPermanentRejection
      ? ServiceInvoiceStatus.REJECTED
      : isFinalAttempt
        ? ServiceInvoiceStatus.FAILED_FINAL
        : ServiceInvoiceStatus.FAILED_RETRYING;

    await this.prisma.serviceInvoice.update({
      where: { id: invoice.id },
      data: {
        status,
        lastFailureReason: message,
        providerResponse: {
          error: message,
          attempt: context.attempt,
          maxAttempts: context.maxAttempts,
        },
      },
    });

    await this.recordAuditEvent(this.prisma, {
      tenantId: invoice.tenantId,
      serviceInvoiceId: invoice.id,
      actorUserId: invoice.issuedByUserId,
      type: isPermanentRejection
        ? FiscalAuditEventType.INVOICE_ISSUE_REJECTED
        : FiscalAuditEventType.INVOICE_ISSUE_FAILED,
      message,
      metadata: {
        attempt: context.attempt,
        maxAttempts: context.maxAttempts,
        status,
      },
    });

    if (!isPermanentRejection) {
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async markQueuePublishFailure(
    invoice: ServiceInvoiceWithRelations,
    error: unknown,
  ) {
    const message = this.getErrorMessage(error);
    await this.prisma.serviceInvoice.update({
      where: { id: invoice.id },
      data: { lastFailureReason: message },
    });
    await this.recordAuditEvent(this.prisma, {
      tenantId: invoice.tenantId,
      serviceInvoiceId: invoice.id,
      actorUserId: invoice.issuedByUserId,
      type: FiscalAuditEventType.INVOICE_ISSUE_FAILED,
      message: `Could not publish service invoice job: ${message}`,
    });
  }

  private async recordAuditEvent(
    client: AuditClient,
    data: {
      tenantId: string;
      serviceInvoiceId?: string | null;
      actorUserId?: string | null;
      type: FiscalAuditEventType;
      message?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await client.fiscalAuditEvent.create({ data });
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unexpected fiscal issuing error';
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
