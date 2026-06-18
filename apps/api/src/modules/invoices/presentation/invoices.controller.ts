import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Auth } from '../../authorization/auth-context';
import type { AuthContext } from '../../authorization/auth-context';
import { CancelServiceInvoiceDto } from '../application/dto/cancel-service-invoice.dto';
import { CreateServiceInvoiceDto } from '../application/dto/create-service-invoice.dto';
import { InvoicesService } from '../application/invoices.service';

@Controller('service-invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Auth() auth: AuthContext, @Query('tenantId') tenantId?: string) {
    return this.invoicesService.findAll(auth, tenantId);
  }

  @Post()
  issue(@Auth() auth: AuthContext, @Body() dto: CreateServiceInvoiceDto) {
    return this.invoicesService.issue(dto, auth);
  }

  @Post(':id/cancel')
  cancel(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: CancelServiceInvoiceDto,
  ) {
    return this.invoicesService.cancel(id, dto, auth);
  }

  @Get(':id/status')
  refreshStatus(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.invoicesService.refreshStatus(id, auth);
  }
}
