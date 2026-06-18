import { Body, Controller, Param, Put } from '@nestjs/common';
import { Auth } from '../../authorization/auth-context';
import type { AuthContext } from '../../authorization/auth-context';
import { TenantAccessService } from '../../authorization/tenant-access.service';
import { UpsertProfileDto } from '../application/dto/upsert-profile.dto';
import { ProfilesService } from '../application/profiles.service';

@Controller('users/:userId/profile')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Put()
  upsert(
    @Auth() auth: AuthContext,
    @Param('userId') userId: string,
    @Body() dto: UpsertProfileDto,
  ) {
    this.tenantAccess.assertSelfOrAdmin(auth, userId);
    return this.profilesService.upsert(userId, dto);
  }
}
