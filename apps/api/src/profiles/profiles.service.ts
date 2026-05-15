import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async upsert(userId: string, dto: UpsertProfileDto) {
    await this.usersService.findOne(userId);

    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { ...dto, userId },
      update: dto,
    });
  }
}
