import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { CategoriaPago } from '../common/metodo-pago.enum';

@Index('ix_extraccion_tenant_fecha', ['tenant_id', 'fecha'])
@Entity('extraccion_ingreso')
export class ExtraccionIngreso extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['EFECTIVO', 'BANCARIZADO'] })
  origen: CategoriaPago;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ length: 500 })
  motivo: string;

  @CreateDateColumn()
  fecha: Date;
}
