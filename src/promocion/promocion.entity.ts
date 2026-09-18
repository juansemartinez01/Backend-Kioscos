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
import { PromocionProducto } from './promocion-producto.entity';
import { Almacen } from '../almacen/almacen.entity';

/** `codigo` era UNIQUE global. Dos clientes pueden tener su propio "COMBO1". */
@Index('uq_promocion_tenant_codigo', ['tenant_id', 'codigo'], { unique: true })
@Index('idx_promocion_tenant_almacen', ['tenant_id', 'almacenId'])
@Entity('promocion')
export class Promocion extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigo: string;

  @Column('decimal')
  precioPromo: number;

  @Column({ name: 'almacen_id', type: 'int', nullable: true })
  almacenId: number | null;

  @ManyToOne(() => Almacen, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PromocionProducto, (pp) => pp.promocion, { cascade: true })
  productos: PromocionProducto[];

  @Column({ default: true })
  activo: boolean;
}
