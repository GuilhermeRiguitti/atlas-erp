import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContext } from './auth-context';
import { TenantAccessService } from './tenant-access.service';

function makeService(findFirstResult: unknown) {
  const prisma = {
    tenantTitular: {
      findFirst: jest.fn().mockResolvedValue(findFirstResult),
    },
  } as unknown as PrismaService;
  const service = new TenantAccessService(prisma);
  return { service, prisma };
}

const admin: AuthContext = { userId: 'admin_1', role: 'ADMIN' };
const member: AuthContext = { userId: 'user_1', role: 'MEMBER' };
const anonymous: AuthContext = { userId: null, role: null };

describe('TenantAccessService', () => {
  describe('assertTenantAccess', () => {
    it('permite admin da plataforma sem consultar associacao', async () => {
      const { service, prisma } = makeService(null);
      await expect(
        service.assertTenantAccess(admin, 'tenant_x'),
      ).resolves.toBeUndefined();
      expect(prisma.tenantTitular.findFirst).not.toHaveBeenCalled();
    });

    it('permite titular do tenant', async () => {
      const { service } = makeService({ id: 'titular_1' });
      await expect(
        service.assertTenantAccess(member, 'tenant_1'),
      ).resolves.toBeUndefined();
    });

    it('bloqueia usuario que nao e titular do tenant (IDOR)', async () => {
      const { service } = makeService(null);
      await expect(
        service.assertTenantAccess(member, 'tenant_alheio'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bloqueia requisicao sem usuario autenticado', async () => {
      const { service } = makeService(null);
      await expect(
        service.assertTenantAccess(anonymous, 'tenant_1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('accessibleTenantWhere', () => {
    it('nao filtra para admin da plataforma', () => {
      const { service } = makeService(null);
      expect(service.accessibleTenantWhere(admin)).toBeUndefined();
    });

    it('limita a tenants do usuario para nao-admin', () => {
      const { service } = makeService(null);
      expect(service.accessibleTenantWhere(member)).toEqual({
        titulares: { some: { userId: 'user_1' } },
      });
    });
  });

  describe('assertSelfOrAdmin', () => {
    it('permite admin agir sobre qualquer usuario', () => {
      const { service } = makeService(null);
      expect(() => service.assertSelfOrAdmin(admin, 'outro')).not.toThrow();
    });

    it('permite usuario agir sobre si mesmo', () => {
      const { service } = makeService(null);
      expect(() => service.assertSelfOrAdmin(member, 'user_1')).not.toThrow();
    });

    it('bloqueia usuario agindo sobre outro usuario', () => {
      const { service } = makeService(null);
      expect(() => service.assertSelfOrAdmin(member, 'outro')).toThrow(
        ForbiddenException,
      );
    });
  });
});
