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
import { CuentaCorriente } from './cuenta-corriente.entity';
import { Venta } from '../venta/venta.entity';
import { Usuario } from '../usuario/usuario.entity';
import { CuentaCorrientePago } from './cuenta-corriente-pago.entity';

export enum CuentaCorrienteMovimientoTipo {
  DEUDA = 'DEUDA',
  PAGO = 'PAGO',
  AJUSTE_DEBITO = 'AJUSTE_DEBITO',
  AJUSTE_CREDITO = 'AJUSTE_CREDITO',
  SALDO_A_FAVOR = 'SALDO_A_FAVOR',
}

/**
 * Es el libro mayor de la cuenta: siempre se lee filtrando por cuenta y
 * ordenando por fecha. El índice compuesto cubre las dos cosas de una.
 */
@Index('ix_cc_mov_tenant_cuenta_fecha', [
  'tenant_id',
  'cuentaCorrienteId',
  'fecha',
])
@Entity('cuenta_corriente_movimiento')
export class CuentaCorrienteMovimiento extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cuenta_corriente_id', type: 'int' })
  cuentaCorrienteId: number;

  @ManyToOne(() => CuentaCorriente, (cuenta) => cuenta.movimientos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cuenta_corriente_id' })
  cuentaCorriente: CuentaCorriente;

  @Column({ type: 'enum', enum: CuentaCorrienteMovimientoTipo })
  tipo: CuentaCorrienteMovimientoTipo;

  @Column({ name: 'venta_id', type: 'int', nullable: true })
  ventaId: number | null;

  @ManyToOne(() => Venta, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta | null;

  @Column({ name: 'pago_id', type: 'int', nullable: true })
  pagoId: number | null;

  @ManyToOne(() => CuentaCorrientePago, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'pago_id' })
  pago: CuentaCorrientePago | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({
    name: 'saldo_resultante',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  saldoResultante: number;

  @Column({ type: 'varchar', length: 500 })
  descripcion: string;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
