import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClientsService } from './application/clients.service';
import { ClientsController } from './presentation/clients.controller';

@Module({
  imports: [UsersModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
