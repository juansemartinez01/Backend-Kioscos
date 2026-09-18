import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Proveedor } from '../proveedor/proveedor.entity';
import { OrdenCompraItem } from './orden-compra-item.entity';
import { Gasto } from '../gastos/gasto.entity';
import { MovimientoStock } from '../movimiento-stock/movimiento-stock.entity';

export enum OrdenCompraEstado {
  ACTIVA = 'ACTIVA',
  ANULADA = 'ANULADA',
}

@Index('ix_orden_compra_tenant_fecha', ['tenant_id', 'fecha'])
@Index('ix_orden_compra_tenant_estado', ['tenant_id', 'estado'])
@Entity('orden_compra')
export class OrdenCompra extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Proveedor, (prov) => prov.compras, { nullable: false })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({ name: 'almacen_id', type: 'int', nullable: true, default: null })
  almacen_id: number | null;

  @Column({ type: 'numeric', nullable: true })
  total?: number;

  @Column({
    type: 'enum',
    enum: OrdenCompraEstado,
    default: OrdenCompraEstado.ACTIVA,
  })
  estado: OrdenCompraEstado;

  @Column({ name: 'gasto_id', type: 'int', nullable: true })
  gastoId: number | null;

  @OneToOne(() => Gasto, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'gasto_id' })
  gasto: Gasto | null;

  @Column({
    name: 'numero_comprobante',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  numeroComprobante: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({
    name: 'motivo_anulacion',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  motivoAnulacion: string | null;

  @Column({ name: 'fecha_anulacion', type: 'timestamp', nullable: true })
  fechaAnulacion: Date | null;

  @OneToMany(() => OrdenCompraItem, (item) => item.orden, { cascade: true })
  items: OrdenCompraItem[];

  @OneToMany(() => MovimientoStock, (movimiento) => movimiento.ordenCompra)
  movimientos: MovimientoStock[];
}
