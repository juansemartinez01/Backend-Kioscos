import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';

@Index('ix_unidad_tenant', ['tenant_id'])
@Entity('unidad')
export class Unidad extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 20, nullable: true })
  abreviatura: string;
}
