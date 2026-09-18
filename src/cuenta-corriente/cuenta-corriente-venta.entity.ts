import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { CuentaCorriente } from './cuenta-corriente.entity';
import { Venta } from '../venta/venta.entity';
import { CuentaCorrientePagoAplicacion } from './cuenta-corriente-pago-aplicacion.entity';

export enum CuentaCorrienteVentaEstado {
  PENDIENTE = 'PENDIENTE',
  PARCIAL = 'PARCIAL',
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
}

/**
 * La pantalla de cobro pide "que le debe esta cuenta": filtra por cuenta y por
 * estado (PENDIENTE / PARCIAL). El segundo índice es para el camino inverso,
 * desde una venta a su registro en cuenta corriente.
 */
@Index('ix_cc_venta_tenant_cuenta_estado', [
  'tenant_id',
  'cuentaCorrienteId',
  'estado',
])
@Index('ix_cc_venta_tenant_venta', ['tenant_id', 'ventaId'])
@Entity('cuenta_corriente_venta')
export class CuentaCorrienteVenta extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cuenta_corriente_id', type: 'int' })
  cuentaCorrienteId: number;

  @ManyToOne(() => CuentaCorriente, (cuenta) => cuenta.ventas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cuenta_corriente_id' })
  cuentaCorriente: CuentaCorriente;

  @Column({ name: 'venta_id', type: 'int' })
  ventaId: number;

  @ManyToOne(() => Venta, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ name: 'monto_original', type: 'decimal', precision: 12, scale: 2 })
  montoOriginal: number;

  @Column({
    name: 'monto_pagado',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  montoPagado: number;

  @Column({ name: 'monto_pendiente', type: 'decimal', precision: 12, scale: 2 })
  montoPendiente: number;

  @Column({
    type: 'enum',
    enum: CuentaCorrienteVentaEstado,
    default: CuentaCorrienteVentaEstado.PENDIENTE,
  })
  estado: CuentaCorrienteVentaEstado;

  @OneToMany(
    () => CuentaCorrientePagoAplicacion,
    (aplicacion) => aplicacion.cuentaCorrienteVenta,
  )
  aplicaciones: CuentaCorrientePagoAplicacion[];

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
