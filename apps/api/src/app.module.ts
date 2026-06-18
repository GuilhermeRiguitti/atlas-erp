import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthorizationModule,
    UsersModule,
    AuthModule,
    ProfilesModule,
    OnboardingModule,
    TenantsModule,
    ClientsModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
