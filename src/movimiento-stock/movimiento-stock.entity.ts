import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Producto } from '../producto/producto.entity';
import { Almacen } from '../almacen/almacen.entity';
import { Proveedor } from '../proveedor/proveedor.entity';
import { OrdenCompra } from '../orden-compra/orden-compra.entity';
import { OrdenCompraItem } from '../orden-compra/orden-compra-item.entity';

/**
 * Tabla de log: crece sin techo y se consulta por rango de fecha. Sin estos dos
 * índices, cada listado escanea los movimientos de todos los tenants.
 */
@Index('ix_mov_stock_tenant_fecha', ['tenant_id', 'fecha'])
@Index('ix_mov_stock_tenant_producto_fecha', [
  'tenant_id',
  'producto_id',
  'fecha',
])
@Entity('movimiento_stock')
export class MovimientoStock extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'producto_id', type: 'int' })
  producto_id: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ name: 'origen_almacen', type: 'int', nullable: true })
  origen_almacen?: number;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'origen_almacen' })
  almacenOrigen?: Almacen;

  @Column({ name: 'destino_almacen', type: 'int', nullable: true })
  destino_almacen?: number;

  @ManyToOne(() => Almacen)
  @JoinColumn({ name: 'destino_almacen' })
  almacenDestino?: Almacen;

  @Column({ type: 'int', nullable: true })
  cantidad?: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 3, nullable: true })
  cantidad_gramos?: string | null;

  @Column({ length: 20 })
  tipo: 'entrada' | 'salida' | 'traspaso' | 'insumo';

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuario_id?: number;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @Column({ name: 'proveedor_id', nullable: true })
  proveedor_id?: number;

  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedor_id' })
  proveedor?: Proveedor;

  @Column({
    name: 'precio_unitario',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  precioUnitario?: number;

  @Column({
    name: 'precio_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  precioTotal?: number;

  @Column({ name: 'orden_compra_id', type: 'int', nullable: true })
  ordenCompraId?: number | null;

  @ManyToOne(() => OrdenCompra, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orden_compra_id' })
  ordenCompra?: OrdenCompra | null;

  @Column({ name: 'orden_compra_item_id', type: 'int', nullable: true })
  ordenCompraItemId?: number | null;

  @ManyToOne(() => OrdenCompraItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orden_compra_item_id' })
  ordenCompraItem?: OrdenCompraItem | null;
}
