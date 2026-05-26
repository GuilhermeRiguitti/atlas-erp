import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { QueueModule } from '../queue/queue.module';
import { TenantsModule } from '../tenants/tenants.module';
import { InvoicesService } from './application/invoices.service';
import { FiscalInvoiceQueueProducer } from './application/queues/fiscal-invoice-queue.producer';
import { FISCAL_INVOICE_QUEUE } from './application/queues/fiscal-invoice-queue.constants';
import { FiscalProviderFactory } from './infrastructure/fiscal-providers/fiscal-provider.factory';
import { InvoicesController } from './presentation/invoices.controller';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: FISCAL_INVOICE_QUEUE }),
    ClientsModule,
    TenantsModule,
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    FiscalProviderFactory,
    FiscalInvoiceQueueProducer,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
