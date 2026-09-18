import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Venta } from './venta.entity';
import { Producto } from '../producto/producto.entity';

@Index('ix_venta_item_tenant_venta', ['tenant_id', 'venta'])
@Entity('venta_item')
export class VentaItem extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Venta, (venta) => venta.items)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  // TODO(fase-3): sacar el `eager` junto con el `relations` del service. Hoy
  // cada item trae el producto anidado en la respuesta.
  @ManyToOne(() => Producto, { eager: true, nullable: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto | null;

  /** Piezas. */
  @Column({ type: 'int', nullable: true })
  cantidad: number | null;

  /** Gramos. */
  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  cantidad_gramos: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
