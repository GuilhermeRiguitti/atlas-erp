import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('FiscalWorker');
  await NestFactory.createApplicationContext(WorkerModule);
  logger.log('Fiscal worker started and waiting for jobs');
}

void bootstrap();
