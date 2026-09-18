import { Provider } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import type { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { DataSource, EntityTarget, Repository } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

/**
 * ESTA ES LA PIEZA QUE EVITA REESCRIBIR TODO EL CÓDIGO.
 *
 * Reemplaza el provider del token del repositorio por uno que devuelve un Proxy.
 * El Proxy resuelve el EntityManager de la transacción del request EN CADA
 * ACCESO, no al construirse. Resultado: los servicios siguen escritos igual que
 * en el proyecto viejo —
 *
 *   constructor(@InjectRepository(Venta) private repo: Repository<Venta>) {}
 *
 * — pero por debajo cada llamada entra por la conexión que tiene
 * `app.tenant_id` aplicado. Los ~334 call sites del port no se tocan.
 *
 * POR QUÉ UN PROXY Y NO `Scope.REQUEST`:
 *
 * Un provider request-scoped contagia el scope hacia arriba: el servicio que lo
 * inyecta se vuelve request-scoped, y el controller que inyecta ese servicio
 * también. Con 25 servicios y 23 controllers terminaríamos reinstanciando el
 * grafo entero en cada request. El Proxy es singleton y resuelve por llamada,
 * así que no contagia nada.
 *
 * Además evita un problema de orden: los request-scoped se resuelven antes de
 * que corran los interceptors, o sea antes de que exista la transacción.
 *
 * FALLBACK: si no hay contexto (ruta pública, o un job fuera de request), cae al
 * manager global del DataSource. Ese manager NO tiene `app.tenant_id`, así que
 * RLS no le devuelve filas de las tablas con tenant. Falla cerrado, no abierto.
 */
export function crearProxyDeRepositorio<T extends object>(
  entity: EntityTarget<T>,
  tenantContext: TenantContextService,
  dataSource: DataSource,
): Repository<T> {
  const resolver = (): Repository<T> => {
    const manager = tenantContext.getManager() ?? dataSource.manager;
    return manager.getRepository(entity);
  };

  return new Proxy({} as Repository<T>, {
    get(_target, prop, receiver) {
      const repo = resolver();
      const value = Reflect.get(repo, prop, receiver);
      return typeof value === 'function' ? value.bind(repo) : value;
    },
    set(_target, prop, value) {
      return Reflect.set(resolver(), prop, value);
    },
    has(_target, prop) {
      return Reflect.has(resolver(), prop);
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(resolver());
    },
  });
}

/**
 * Se usa en lugar de `TypeOrmModule.forFeature([...])` en los módulos de
 * negocio. Misma lista de entidades, mismos tokens, comportamiento con tenant.
 */
export function tenantRepositoryProviders(
  entities: EntityClassOrSchema[],
): Provider[] {
  return entities.map((entity) => ({
    provide: getRepositoryToken(entity),
    inject: [TenantContextService, getDataSourceToken()],
    useFactory: (tenantContext: TenantContextService, dataSource: DataSource) =>
      crearProxyDeRepositorio(entity, tenantContext, dataSource),
  }));
}
