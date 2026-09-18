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
import { Venta } from '../venta/venta.entity';
import {
  MetodoPagoPersistido,
  METODOS_PAGO_PERSISTIDOS,
} from '../common/metodo-pago.enum';

/** `(tenant_id, fecha)` es el índice de los cierres de caja y los reportes por método de pago. */
@Index('ix_ingreso_venta_tenant_fecha', ['tenant_id', 'fecha'])
@Index('ix_ingreso_venta_tenant_venta', ['tenant_id', 'venta'])
@Entity('ingreso_venta')
export class IngresoVenta extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Venta, (venta) => venta.ingresos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ type: 'enum', enum: METODOS_PAGO_PERSISTIDOS })
  tipo: MetodoPagoPersistido;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({
    name: 'detalle_pago',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  detalle_pago: string | null;

  @CreateDateColumn()
  fecha: Date;
}
