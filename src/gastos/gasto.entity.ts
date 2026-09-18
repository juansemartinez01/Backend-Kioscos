import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { OrdenCompra } from '../orden-compra/orden-compra.entity';
import { Almacen } from '../almacen/almacen.entity';
import { GastoCategoria } from './gasto-categoria.entity';

export enum GastoOrigen {
  MANUAL = 'MANUAL',
  ORDEN_COMPRA = 'ORDEN_COMPRA',
}

/** Los cuatro índices ya existían; acá van con `tenant_id` adelante. */
@Index('idx_gasto_tenant_fecha', ['tenant_id', 'fecha'])
@Index('idx_gasto_tenant_monto', ['tenant_id', 'monto'])
@Index('idx_gasto_tenant_categoria', ['tenant_id', 'categoriaId'])
@Index('idx_gasto_tenant_almacen', ['tenant_id', 'almacenId'])
@Entity('gasto')
export class Gasto extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** `date` puro, para evitar líos de zona horaria. Formato 'YYYY-MM-DD'. */
  @Column({ type: 'date' })
  fecha: string;

  /** NUMERIC de PG: se maneja como string para no perder precisión. */
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  monto: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  notas?: string | null;

  @Column({ name: 'categoria_id', type: 'int', nullable: true })
  categoriaId: number | null;

  @ManyToOne(() => GastoCategoria, (categoria) => categoria.gastos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoria_id' })
  categoria: GastoCategoria | null;

  @Column({ name: 'almacen_id', type: 'int', nullable: true })
  almacenId: number | null;

  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen | null;

  @Column({ type: 'enum', enum: GastoOrigen, default: GastoOrigen.MANUAL })
  origen: GastoOrigen;

  @Column({ name: 'orden_compra_id', type: 'int', nullable: true })
  ordenCompraId: number | null;

  @ManyToOne(() => OrdenCompra, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orden_compra_id' })
  ordenCompra: OrdenCompra | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
