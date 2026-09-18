import { Column, Index } from 'typeorm';

/**
 * Clase base de toda entidad con dueño. Heredar de acá es lo único que hace
 * falta para que la tabla entre en el esquema multitenant.
 *
 * El índice simple sobre tenant_id es un piso, no el objetivo: cada entidad
 * debería además declarar su índice COMPUESTO con las columnas por las que
 * realmente filtra. Ver `docs/indices.md`.
 *
 *   @Index(['tenant_id', 'almacen_id', 'fecha'])
 *   export class Venta extends TenantOwnedEntity { ... }
 *
 * Sin el compuesto, cada query escanea las filas de todos los tenants para
 * descartarlas, y el sistema se degrada con cada cliente nuevo.
 */
export abstract class TenantOwnedEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'int' })
  tenant_id: number;
}
