import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Unidad } from '../unidad/unidad.entity';
import { Categoria } from '../categoria/categoria.entity';
import { OrdenCompraItem } from '../orden-compra/orden-compra-item.entity';
import { StockActual } from '../stock-actual/stock-actual.entity';

/**
 * `sku` y `barcode` eran UNIQUE globales. Pasan a compuestos: dos clientes
 * pueden vender el mismo producto, y de hecho el barcode de una Coca es el
 * mismo en todos lados — con el UNIQUE global, el segundo cliente que la carga
 * recibe un error de duplicado por un dato que es legítimamente suyo.
 *
 * Ambos índices son además los que usa el POS para escanear, así que arrancan
 * con `tenant_id` y sirven para la búsqueda en un solo paso.
 */
@Index('uq_producto_tenant_sku', ['tenant_id', 'sku'], { unique: true })
@Index('uq_producto_tenant_barcode', ['tenant_id', 'barcode'], { unique: true })
@Index('ix_producto_tenant_categoria', ['tenant_id', 'categoria_id'])
@Entity('producto')
export class Producto extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  sku: string;

  @Column({ length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'unidad_id' })
  unidad_id: number;

  @ManyToOne(() => Unidad, { nullable: false })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'categoria_id', nullable: true })
  categoria_id?: number;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'categoria_id' })
  categoria?: Categoria;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  precioBase: number;

  @OneToMany(() => OrdenCompraItem, (item) => item.producto)
  compras: OrdenCompraItem[];

  @OneToMany(() => StockActual, (stock) => stock.producto)
  stock: StockActual[];

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'boolean', name: 'es_por_gramos', default: false })
  es_por_gramos: boolean;

  @Column({ type: 'boolean', default: false })
  inOferta: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  precio_updated_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  proveedorNombre?: string;
}
