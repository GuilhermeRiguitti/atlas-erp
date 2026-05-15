import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TenantFiscalCredentialsService } from './application/tenant-fiscal-credentials.service';
import { TenantsService } from './application/tenants.service';
import { TenantSecretCryptoService } from './infrastructure/tenant-secret-crypto.service';
import { TenantsController } from './presentation/tenants.controller';

@Module({
  imports: [UsersModule],
  controllers: [TenantsController],
  providers: [
    TenantsService,
    TenantFiscalCredentialsService,
    TenantSecretCryptoService,
  ],
  exports: [TenantsService, TenantFiscalCredentialsService],
})
export class TenantsModule {}
