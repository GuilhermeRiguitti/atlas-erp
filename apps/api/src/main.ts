import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (internalApiKey) {
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (request.path === '/') {
        return next();
      }

      if (request.header('x-internal-api-key') !== internalApiKey) {
        return response.status(401).json({ message: 'Unauthorized' });
      }

      return next();
    });
  }

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();
