import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContext } from './auth-context';

const PLATFORM_ADMIN_ROLE = 'ADMIN';

/**
 * Autorizacao de nivel de objeto (object-level authorization) para o modelo
 * multi-tenant. Garante que um usuario so acesse dados dos tenants dos quais e
 * titular. Usuarios com papel global ADMIN sao administradores da plataforma e
 * tem acesso amplo (suporte/operacao).
 */
@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isPlatformAdmin(ctx: AuthContext): boolean {
    return ctx.role === PLATFORM_ADMIN_ROLE;
  }

  requireUserId(ctx: AuthContext): string {
    if (!ctx.userId) {
      throw new UnauthorizedException('Authenticated user is required');
    }
    return ctx.userId;
  }

  /** Garante que o usuario e titular do tenant (ou admin da plataforma). */
  async assertTenantAccess(ctx: AuthContext, tenantId: string): Promise<void> {
    if (this.isPlatformAdmin(ctx)) {
      return;
    }

    const userId = this.requireUserId(ctx);
    const membership = await this.prisma.tenantTitular.findFirst({
      where: { tenantId, userId },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this tenant resource',
      );
    }
  }

  /**
   * Filtro Prisma que limita uma listagem de tenants aos acessiveis pelo
   * usuario. Admin da plataforma nao tem filtro (ve todos).
   */
  accessibleTenantWhere(ctx: AuthContext): Prisma.TenantWhereInput | undefined {
    if (this.isPlatformAdmin(ctx)) {
      return undefined;
    }
    const userId = this.requireUserId(ctx);
    return { titulares: { some: { userId } } };
  }

  assertPlatformAdmin(ctx: AuthContext): void {
    if (!this.isPlatformAdmin(ctx)) {
      throw new ForbiddenException('Platform administrator role is required');
    }
  }

  /** Permite a acao se for admin da plataforma ou o proprio usuario alvo. */
  assertSelfOrAdmin(ctx: AuthContext, targetUserId: string): void {
    if (this.isPlatformAdmin(ctx)) {
      return;
    }
    const userId = this.requireUserId(ctx);
    if (userId !== targetUserId) {
      throw new ForbiddenException('You can only act on your own user');
    }
  }
}
