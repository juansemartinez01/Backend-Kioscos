import { Column } from 'typeorm';

/**
 * Clase base de toda entidad con dueño. Heredar de acá es lo único que hace
 * falta para que la tabla entre en el esquema multitenant.
 *
 * A propósito NO declara ningún índice.
 *
 * La versión anterior ponía un `@Index()` sobre `tenant_id` acá, como piso.
 * El problema es que casi todas las tablas declaran además su índice compuesto
 * `(tenant_id, ...)`, y Postgres ya usa un compuesto para una consulta que
 * filtra solo por su primera columna. El índice suelto quedaba duplicado en 29
 * de las 32 tablas: no aceleraba ninguna lectura y encarecía cada escritura,
 * además de aparecer en el esquema con nombres ilegibles (`IDX_89dcc27a...`).
 *
 * Entonces el índice lo declara cada entidad, con nombre y con las columnas por
 * las que realmente filtra:
 *
 *   @Index('ix_venta_tenant_fecha', ['tenant_id', 'fecha'])
 *   export class Venta extends TenantOwnedEntity { ... }
 *
 * La regla no cambió, solo dónde se escribe: toda entidad con dueño necesita al
 * menos un índice que arranque con `tenant_id`. Sin él, cada consulta escanea
 * las filas de todos los tenants para descartarlas, y el sistema se degrada con
 * cada cliente nuevo. El test de aislamiento verifica que ninguna quede sin uno.
 */
export abstract class TenantOwnedEntity {
  @Column({ name: 'tenant_id', type: 'int' })
  tenant_id: number;
}
