import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Identidade do usuario autenticado, propagada pelo BFF (Next) via headers
 * `x-user-id` / `x-user-role`. O canal e protegido pelo `INTERNAL_API_KEY`, e a
 * API nunca deve ficar publicamente exposta (ver docs/security-hardening.md).
 *
 * Limitacao conhecida: a confianca nesses headers depende da fronteira do
 * internal key. O endurecimento definitivo e autenticar cada requisicao com JWT
 * proprio na API (ver TODO).
 */
export type AuthContext = {
  userId: string | null;
  role: string | null;
};

export const Auth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return {
      userId: request.header('x-user-id') || null,
      role: request.header('x-user-role') || null,
    };
  },
);
