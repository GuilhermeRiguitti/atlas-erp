import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvoicesService } from '../../application/invoices.service';
import {
  FISCAL_INVOICE_ISSUE_JOB,
  FISCAL_INVOICE_QUEUE,
} from '../../application/queues/fiscal-invoice-queue.constants';
import { FiscalInvoiceIssueJob } from '../../application/queues/fiscal-invoice-job.types';

@Processor(FISCAL_INVOICE_QUEUE, {
  concurrency: Number(process.env.FISCAL_QUEUE_CONCURRENCY ?? 2),
})
export class FiscalInvoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(FiscalInvoiceProcessor.name);

  constructor(private readonly invoicesService: InvoicesService) {
    super();
  }

  async process(job: Job<FiscalInvoiceIssueJob>) {
    if (job.name !== FISCAL_INVOICE_ISSUE_JOB) {
      this.logger.warn(`Ignoring unknown fiscal job: ${job.name}`);
      return;
    }

    await this.invoicesService.processQueuedInvoice(job.data.invoiceId, {
      attempt: job.attemptsMade + 1,
      maxAttempts: Number(job.opts.attempts ?? 1),
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<FiscalInvoiceIssueJob>) {
    this.logger.log(`Fiscal invoice job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<FiscalInvoiceIssueJob> | undefined, error: Error) {
    this.logger.warn(
      `Fiscal invoice job failed: ${job?.id ?? 'unknown'} - ${error.message}`,
    );
  }
}
