import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Gasto } from './gasto.entity';

/** `nombre` era UNIQUE global: el primer cliente que cree "Servicios" se la bloquea al resto. */
@Index('uq_gasto_categoria_tenant_nombre', ['tenant_id', 'nombre'], {
  unique: true,
})
@Entity('gasto_categoria')
export class GastoCategoria extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Gasto, (gasto) => gasto.categoria)
  gastos: Gasto[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
