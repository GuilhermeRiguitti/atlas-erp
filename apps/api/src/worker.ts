import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { InvoicesService } from './modules/invoices/application/invoices.service';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('FiscalWorker');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const invoicesService = app.get(InvoicesService);
  const recovered = await invoicesService.requeuePendingInvoices();
  const recoveryInterval = Number(
    process.env.FISCAL_QUEUE_RECOVERY_INTERVAL_MS ?? 60000,
  );

  setInterval(() => {
    void recoverPendingInvoices(invoicesService, logger);
  }, recoveryInterval);

  logger.log('Fiscal worker started and waiting for jobs');
  logger.log(`Recovered ${recovered} pending fiscal invoice job(s)`);
}

async function recoverPendingInvoices(
  invoicesService: InvoicesService,
  logger: Logger,
) {
  try {
    const total = await invoicesService.requeuePendingInvoices();
    if (total > 0) {
      logger.log(`Recovered ${total} pending fiscal invoice job(s)`);
    }
  } catch (error) {
    logger.warn(
      `Could not recover pending fiscal invoice jobs: ${
        error instanceof Error ? error.message : 'unexpected error'
      }`,
    );
  }
}

void bootstrap();
