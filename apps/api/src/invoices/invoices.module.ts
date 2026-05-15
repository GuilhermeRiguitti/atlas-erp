import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { FiscalProviderFactory } from './fiscal-providers/fiscal-provider.factory';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [ClientsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, FiscalProviderFactory],
})
export class InvoicesModule {}
