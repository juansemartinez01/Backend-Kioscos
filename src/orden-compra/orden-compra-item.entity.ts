import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Producto } from '../producto/producto.entity';
import { OrdenCompra } from './orden-compra.entity';

@Index('ix_oc_item_tenant_orden', ['tenant_id', 'orden'])
@Entity('orden_compra_item')
export class OrdenCompraItem extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrdenCompra, (oc) => oc.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orden_compra_id' })
  orden: OrdenCompra;

  @ManyToOne(() => Producto, (p) => p.compras, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column('int', { nullable: true })
  cantidad: number | null;

  @Column('numeric', { precision: 12, scale: 3, nullable: true })
  cantidad_gramos: string | null;

  @Column('numeric')
  precioUnitario: number;

  @Column('numeric')
  subtotal: number;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: string | null;
}
