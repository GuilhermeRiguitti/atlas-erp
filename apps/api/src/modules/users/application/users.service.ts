import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../prisma/prisma.service';

const userInclude = { profile: true } satisfies Prisma.UserInclude;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    await this.ensureEmailIsAvailable(dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        role: dto.role,
        status: dto.status,
      },
      include: userInclude,
    });

    return this.sanitize(user);
  }

  async findAll(query?: string) {
    const users = await this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
              { profile: { headline: { contains: query } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: userInclude,
    });

    return users.map((user) => this.sanitize(user));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitize(user);
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userInclude,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.email) {
      await this.ensureEmailIsAvailable(dto.email, id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase(),
        name: dto.name,
        role: dto.role,
        status: dto.status,
        passwordHash: dto.password
          ? await bcrypt.hash(dto.password, 10)
          : undefined,
      },
      include: userInclude,
    });

    return this.sanitize(user);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { id };
  }

  sanitize(user: User & { profile?: unknown }) {
    const safeUser = { ...user };
    delete (safeUser as Partial<User>).passwordHash;
    return safeUser;
  }

  private async ensureEmailIsAvailable(email: string, ignoredUserId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing && existing.id !== ignoredUserId) {
      throw new ConflictException('Email already in use');
    }
  }
}
