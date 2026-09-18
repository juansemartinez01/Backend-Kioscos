import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { EntityManager } from 'typeorm';

/**
 * Lo que vive en el contexto de un request.
 *
 * `manager` arranca en null: el middleware crea el store apenas conoce el tenant
 * (antes de abrir conexión), y el interceptor de transacción lo completa después.
 * Es el MISMO objeto por referencia, así que quien lo lea más tarde ve el manager.
 */
export interface TenantStore {
  tenantId: number;
  manager: EntityManager | null;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(store: TenantStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  getStore(): TenantStore | undefined {
    return this.als.getStore();
  }

  getTenantId(): number | null {
    return this.als.getStore()?.tenantId ?? null;
  }

  /**
   * Para código que no puede seguir sin tenant. Si esto explota es un bug de
   * cableado (una ruta que debería estar bajo el middleware y no lo está),
   * no un error del cliente — por eso 500 y no 401.
   */
  requireTenantId(): number {
    const tenantId = this.getTenantId();
    if (tenantId === null) {
      throw new InternalServerErrorException(
        'No hay tenant en el contexto del request',
      );
    }
    return tenantId;
  }

  /**
   * El EntityManager de la transacción del request, o null si todavía no se
   * abrió (o si es una ruta pública sin tenant). Los repos hacen fallback al
   * manager global del DataSource, que NO tiene app.tenant_id seteado y por lo
   * tanto RLS no le deja ver nada de las tablas con tenant. Ese es el
   * comportamiento buscado: fallar cerrado, no abierto.
   */
  getManager(): EntityManager | null {
    return this.als.getStore()?.manager ?? null;
  }
}
