import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CancelServiceInvoiceDto } from '../application/dto/cancel-service-invoice.dto';
import { CreateServiceInvoiceDto } from '../application/dto/create-service-invoice.dto';
import { InvoicesService } from '../application/invoices.service';

@Controller('service-invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId?: string) {
    return this.invoicesService.findAll(tenantId);
  }

  @Post()
  issue(@Body() dto: CreateServiceInvoiceDto) {
    return this.invoicesService.issue(dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelServiceInvoiceDto) {
    return this.invoicesService.cancel(id, dto);
  }

  @Get(':id/status')
  refreshStatus(@Param('id') id: string) {
    return this.invoicesService.refreshStatus(id);
  }
}
