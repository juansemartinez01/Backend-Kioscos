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
 * La PK sigue siendo (producto_id, almacen_id) y no hace falta meterle
 * `tenant_id`: los ids son seriales globales, así que un producto_id ya
 * pertenece a un solo tenant. Agregarlo a la PK no aportaría unicidad y
 * complicaría las FKs.
 *
 * El índice compuesto es para la consulta que más se hace: la lista de precios
 * de un almacén.
 */
@Index('ix_ppa_tenant_almacen', ['tenant_id', 'almacen_id'])
@Entity('producto_precio_almacen')
export class ProductoPrecioAlmacen extends TenantOwnedEntity {
  @PrimaryColumn()
  producto_id: number;

  @PrimaryColumn()
  almacen_id: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Almacen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precio: string;

  @Column({ type: 'boolean', default: false })
  inOferta: boolean;

  @Column({
    name: 'precio_oferta',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  precioOferta: string | null;

  @Column({ type: 'varchar', length: 10, default: 'ARS' })
  moneda: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date;
}
