import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../authorization/auth-context';
import type { AuthContext } from '../../authorization/auth-context';
import { TenantAccessService } from '../../authorization/tenant-access.service';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import { UsersService } from '../application/users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Post()
  create(@Auth() auth: AuthContext, @Body() dto: CreateUserDto) {
    this.tenantAccess.assertPlatformAdmin(auth);
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Auth() auth: AuthContext, @Query('q') query?: string) {
    this.tenantAccess.assertPlatformAdmin(auth);
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Auth() auth: AuthContext, @Param('id') id: string) {
    this.tenantAccess.assertSelfOrAdmin(auth, id);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    this.tenantAccess.assertSelfOrAdmin(auth, id);
    // Apenas admin da plataforma pode alterar papel/status (anti-escalada).
    if (!this.tenantAccess.isPlatformAdmin(auth)) {
      delete dto.role;
      delete dto.status;
    }
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Auth() auth: AuthContext, @Param('id') id: string) {
    this.tenantAccess.assertPlatformAdmin(auth);
    return this.usersService.remove(id);
  }
}
