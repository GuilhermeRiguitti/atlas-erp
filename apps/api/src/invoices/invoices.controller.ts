import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto';
import { InvoicesService } from './invoices.service';

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
}
