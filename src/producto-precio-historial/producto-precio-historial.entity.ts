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

export enum PrecioHistorialTipo {
  BASE = 'BASE',
  OVERRIDE = 'OVERRIDE',
  OVERRIDE_REMOVED = 'OVERRIDE_REMOVED',
}

/**
 * Los tres índices existían ya en el proyecto viejo, pero sin `tenant_id`.
 * Tal cual estaban dejaban de servir acá: al filtrar siempre por tenant
 * primero, Postgres los descarta o los usa mal. Van con `tenant_id` adelante.
 */
@Index('ix_precio_hist_tenant_prod_fecha', [
  'tenant_id',
  'producto_id',
  'created_at',
])
@Index('ix_precio_hist_tenant_alm_fecha', [
  'tenant_id',
  'almacen_id',
  'created_at',
])
@Index('ix_precio_hist_tenant_tipo_fecha', ['tenant_id', 'tipo', 'created_at'])
@Entity('producto_precio_historial')
export class ProductoPrecioHistorial extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  producto_id: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int', nullable: true })
  almacen_id?: number | null;

  @ManyToOne(() => Almacen, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'almacen_id' })
  almacen?: Almacen | null;

  @Column({ type: 'varchar', length: 30 })
  tipo: PrecioHistorialTipo;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  precio_anterior?: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  precio_nuevo?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  usuario_id?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  usuario_nombre?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  origen?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
