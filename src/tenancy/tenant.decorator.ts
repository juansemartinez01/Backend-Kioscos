import { ExecutionContext, createParamDecorator } from '@nestjs/common';

/**
 * Inyecta el tenant del request en un handler.
 *
 *   @Post()
 *   crear(@TenantId() tenantId: number, @Body() dto: CrearVentaDto) { ... }
 *
 * Hace falta bastante menos de lo que parece: RLS ya filtra las lecturas y el
 * trigger de la base completa `tenant_id` en los INSERT. Está para los casos
 * donde el tenant se necesita explícito — logs, nombres de archivo, llamadas a
 * servicios externos.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest<{
      user?: { tenant_id?: number };
    }>();
    return request.user?.tenant_id ?? null;
  },
);
