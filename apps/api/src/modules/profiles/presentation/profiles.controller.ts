import { Body, Controller, Param, Put } from '@nestjs/common';
import { UpsertProfileDto } from '../application/dto/upsert-profile.dto';
import { ProfilesService } from '../application/profiles.service';

@Controller('users/:userId/profile')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Put()
  upsert(@Param('userId') userId: string, @Body() dto: UpsertProfileDto) {
    return this.profilesService.upsert(userId, dto);
  }
}
