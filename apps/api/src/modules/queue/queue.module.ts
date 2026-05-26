import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') ?? 'localhost',
          port: Number(configService.get<string>('REDIS_PORT') ?? 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: {
            age: Number(
              configService.get<string>('QUEUE_REMOVE_COMPLETE_AGE') ?? 86400,
            ),
            count: Number(
              configService.get<string>('QUEUE_REMOVE_COMPLETE_COUNT') ?? 1000,
            ),
          },
          removeOnFail: {
            age: Number(
              configService.get<string>('QUEUE_REMOVE_FAIL_AGE') ?? 604800,
            ),
            count: Number(
              configService.get<string>('QUEUE_REMOVE_FAIL_COUNT') ?? 5000,
            ),
          },
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
