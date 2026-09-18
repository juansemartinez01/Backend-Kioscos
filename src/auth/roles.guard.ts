import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

/**
 * En el proyecto viejo este guard existía, estaba exportado y funcionaba, pero
 * `@Roles()` se usaba CERO veces en todo el código: los 137 endpoints eran, en
 * los hechos, "cualquier usuario autenticado". Un vendedor podía anular ventas
 * o borrar productos.
 *
 * Acá el guard es el mismo; lo que cambia es que en la fase 5 hay que recorrer
 * los 23 controllers y poner `@Roles()` donde corresponda.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!rolesRequeridos?.length) return true;

    const { user } = context.switchToHttp().getRequest<{
      user?: { roles?: string[] };
    }>();

    return rolesRequeridos.some((rol) => user?.roles?.includes(rol));
  }
}
