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
import { CuentaCorrienteVenta } from './cuenta-corriente-venta.entity';
import { CuentaCorrientePago } from './cuenta-corriente-pago.entity';
import { CuentaCorrienteMovimiento } from './cuenta-corriente-movimiento.entity';

/**
 * El listado del front pide las cuentas activas, y la pantalla de cobro busca
 * por documento. Ninguno de los dos índices existía en el proyecto viejo.
 *
 * A propósito NO hay UNIQUE sobre `documento`: el proyecto viejo nunca lo tuvo
 * y los datos reales traen documentos repetidos y vacíos. Agregarlo acá
 * rechazaría altas que hoy funcionan.
 */
@Index('ix_cuenta_corriente_tenant_activa', ['tenant_id', 'activa'])
@Index('ix_cuenta_corriente_tenant_documento', ['tenant_id', 'documento'])
@Entity('cuenta_corriente')
export class CuentaCorriente extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  documento: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string | null;

  @Column({ default: true })
  activa: boolean;

  @Column({
    name: 'saldo_actual',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  saldoActual: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @OneToMany(() => CuentaCorrienteVenta, (venta) => venta.cuentaCorriente)
  ventas: CuentaCorrienteVenta[];

  @OneToMany(() => CuentaCorrientePago, (pago) => pago.cuentaCorriente)
  pagos: CuentaCorrientePago[];

  @OneToMany(
    () => CuentaCorrienteMovimiento,
    (movimiento) => movimiento.cuentaCorriente,
  )
  movimientos: CuentaCorrienteMovimiento[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
