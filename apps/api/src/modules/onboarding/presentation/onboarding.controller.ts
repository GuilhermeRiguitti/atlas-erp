import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StartTenantOnboardingDto } from '../application/dto/start-tenant-onboarding.dto';
import { OnboardingService } from '../application/onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('token')
  validateToken(@Query('token') token: string) {
    return this.onboardingService.validateOnboardingToken(token);
  }

  @Post('tenant')
  startTenantOnboarding(@Body() dto: StartTenantOnboardingDto) {
    return this.onboardingService.startTenantOnboarding(dto);
  }
}
