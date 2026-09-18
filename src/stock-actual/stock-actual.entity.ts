import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Producto } from '../producto/producto.entity';
import { Almacen } from '../almacen/almacen.entity';

/**
 * OJO al portar el service (fase 3): `stock-actual.service.ts:530` y
 * `venta.service.ts:1077` hacen un upsert en SQL crudo contra esta tabla:
 *
 *   INSERT INTO stock_actual (...) VALUES (...)
 *   ON CONFLICT (producto_id, almacen_id) DO NOTHING
 *
 * La PK sigue siendo (producto_id, almacen_id) justamente para que ese
 * ON CONFLICT siga matcheando. Si alguna vez se le agrega `tenant_id` a la
 * clave, esos dos upserts dejan de matchear y **no fallan**: insertan
 * duplicados en silencio. Ningún compilador los va a marcar.
 */
@Index('ix_stock_actual_tenant_almacen', ['tenant_id', 'almacen_id'])
@Entity('stock_actual')
export class StockActual extends TenantOwnedEntity {
  @PrimaryColumn({ name: 'producto_id', type: 'int' })
  producto_id: number;

  @PrimaryColumn({ name: 'almacen_id', type: 'int' })
  almacen_id: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column({ type: 'int' })
  cantidad: number;

  @UpdateDateColumn({ name: 'last_updated' })
  last_updated: Date;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 3,
    name: 'cantidad_gramos',
    nullable: true,
  })
  cantidad_gramos: string | null;
}
