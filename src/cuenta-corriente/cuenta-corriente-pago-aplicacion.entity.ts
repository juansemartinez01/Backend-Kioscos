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
import { CuentaCorrientePago } from './cuenta-corriente-pago.entity';
import { CuentaCorrienteVenta } from './cuenta-corriente-venta.entity';

/**
 * Tabla puente: un pago se reparte entre varias ventas impagas. Se recorre en
 * los dos sentidos (qué ventas cubrió este pago / qué pagos tiene esta venta),
 * así que lleva un índice por cada lado.
 */
@Index('ix_cc_aplicacion_tenant_pago', ['tenant_id', 'pagoId'])
@Index('ix_cc_aplicacion_tenant_cc_venta', [
  'tenant_id',
  'cuentaCorrienteVentaId',
])
@Entity('cuenta_corriente_pago_aplicacion')
export class CuentaCorrientePagoAplicacion extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pago_id', type: 'int' })
  pagoId: number;

  @ManyToOne(() => CuentaCorrientePago, (pago) => pago.aplicaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pago_id' })
  pago: CuentaCorrientePago;

  @Column({ name: 'cuenta_corriente_venta_id', type: 'int' })
  cuentaCorrienteVentaId: number;

  @ManyToOne(() => CuentaCorrienteVenta, (venta) => venta.aplicaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cuenta_corriente_venta_id' })
  cuentaCorrienteVenta: CuentaCorrienteVenta;

  @Column({ name: 'monto_aplicado', type: 'decimal', precision: 12, scale: 2 })
  montoAplicado: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
