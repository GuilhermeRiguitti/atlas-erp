import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { TenantsModule } from '../tenants/tenants.module';
import { InvoicesService } from './application/invoices.service';
import { FiscalProviderFactory } from './infrastructure/fiscal-providers/fiscal-provider.factory';
import { InvoicesController } from './presentation/invoices.controller';

@Module({
  imports: [ClientsModule, TenantsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, FiscalProviderFactory],
})
export class InvoicesModule {}
