import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';

/**
 * Establece el contexto de tenant para todo el request.
 *
 * Corre como middleware (antes que guards, interceptors y la resolución de
 * dependencias) porque el contexto tiene que existir ANTES de que cualquier
 * repositorio se use. Esto es exactamente el bug que tiene el repo hermano
 * `backend-rochester`: ahí el middleware de tenant corre antes del guard que
 * llena `req.user`, así que lee un usuario que todavía no existe.
 *
 * Por eso acá el token se VERIFICA acá mismo en vez de esperar a `req.user`.
 * Es una verificación de más por request (el JwtAuthGuard vuelve a verificar
 * después), pero es criptografía simétrica sobre un string corto: el costo es
 * despreciable al lado de tener el tenant mal.
 *
 * Importante: se verifica, no se decodifica. Un `tenant_id` puesto a mano en un
 * token sin firmar no pasa de acá.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = this.extraerTenantId(req);

    // Sin tenant seguimos igual: son las rutas @Public() (login, health).
    // El que se quede sin contexto y toque una tabla con tenant no va a ver
    // nada, porque RLS lo bloquea en el motor.
    if (tenantId === null) {
      next();
      return;
    }

    this.tenantContext.run({ tenantId, manager: null }, () => next());
  }

  private extraerTenantId(req: Request): number | null {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;

    try {
      const payload = this.jwtService.verify<{ tenant_id?: unknown }>(
        header.slice('Bearer '.length),
      );
      return typeof payload.tenant_id === 'number' ? payload.tenant_id : null;
    } catch {
      // Token vencido, inválido o mal firmado: no es tarea de este middleware
      // rechazarlo. Seguimos sin contexto y el JwtAuthGuard devuelve el 401.
      return null;
    }
  }
}
