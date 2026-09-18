import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Factura } from './factura.entity';
import { VentaItem } from '../venta/venta-item.entity';

@Index('ix_factura_item_tenant_factura', ['tenant_id', 'factura'])
@Entity('factura_venta_item')
export class FacturaVentaItem extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Factura, (factura) => factura.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'factura_id' })
  factura: Factura;

  @ManyToOne(() => VentaItem)
  @JoinColumn({ name: 'venta_item_id' })
  ventaItem: VentaItem;

  @Column('int')
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;
}
