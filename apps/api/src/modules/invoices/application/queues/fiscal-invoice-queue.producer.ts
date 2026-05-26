import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  FISCAL_INVOICE_ISSUE_JOB,
  FISCAL_INVOICE_QUEUE,
} from './fiscal-invoice-queue.constants';
import { FiscalInvoiceIssueJob } from './fiscal-invoice-job.types';

@Injectable()
export class FiscalInvoiceQueueProducer {
  constructor(
    @InjectQueue(FISCAL_INVOICE_QUEUE)
    private readonly queue: Queue<FiscalInvoiceIssueJob>,
    private readonly configService: ConfigService,
  ) {}

  async enqueueIssue(job: FiscalInvoiceIssueJob) {
    return this.queue.add(FISCAL_INVOICE_ISSUE_JOB, job, {
      jobId: `service-invoice:${job.invoiceId}:issue`,
      attempts: Number(
        this.configService.get<string>('FISCAL_QUEUE_ATTEMPTS') ?? 5,
      ),
      backoff: {
        type: 'exponential',
        delay: Number(
          this.configService.get<string>('FISCAL_QUEUE_BACKOFF_MS') ?? 30000,
        ),
      },
    });
  }
}
