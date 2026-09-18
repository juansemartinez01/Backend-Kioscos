import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { OrdenCompra } from '../orden-compra/orden-compra.entity';

@Index('ix_proveedor_tenant', ['tenant_id'])
@Entity('proveedor')
export class Proveedor extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  contacto?: string;

  @Column({ length: 50, nullable: true })
  telefono?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @OneToMany(() => OrdenCompra, (oc) => oc.proveedor)
  compras: OrdenCompra[];
}
