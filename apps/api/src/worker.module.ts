import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { FiscalInvoiceProcessor } from './modules/invoices/infrastructure/workers/fiscal-invoice.processor';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    InvoicesModule,
  ],
  providers: [FiscalInvoiceProcessor],
})
export class WorkerModule {}
