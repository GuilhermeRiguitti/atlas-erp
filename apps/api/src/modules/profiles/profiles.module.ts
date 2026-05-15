import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProfilesService } from './application/profiles.service';
import { ProfilesController } from './presentation/profiles.controller';

@Module({
  imports: [UsersModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
