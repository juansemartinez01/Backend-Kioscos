import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';

@Index('ix_almacen_tenant', ['tenant_id'])
@Entity('almacen')
export class Almacen extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  ubicacion?: string;

  @Column({ type: 'int', nullable: true })
  capacidad?: number;
}
