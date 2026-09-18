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
import { Usuario } from '../usuario/usuario.entity';
import { SesionCaja } from './sesion-caja.entity';
import { CuentaCorrientePago } from '../cuenta-corriente/cuenta-corriente-pago.entity';
import {
  MetodoPagoPersistido,
  METODOS_PAGO_PERSISTIDOS,
} from '../common/metodo-pago.enum';

export enum MovimientoCajaOrigen {
  MANUAL = 'MANUAL',
  CUENTA_CORRIENTE = 'CUENTA_CORRIENTE',
}

@Index('ix_mov_caja_tenant_caja', ['tenant_id', 'caja_id'])
@Index('ix_mov_caja_tenant_fecha', ['tenant_id', 'fecha'])
@Entity('movimiento_caja')
export class MovimientoCaja extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SesionCaja, (caja) => caja.movimientos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'caja_id' })
  caja: SesionCaja;

  @Column({ name: 'caja_id' })
  caja_id: number;

  @Column({ type: 'enum', enum: ['INGRESO', 'EGRESO', 'RETIRO'] })
  tipo: 'INGRESO' | 'EGRESO' | 'RETIRO';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({
    name: 'medio_pago',
    type: 'enum',
    enum: METODOS_PAGO_PERSISTIDOS,
    default: 'EFECTIVO',
  })
  medio_pago: MetodoPagoPersistido;

  @Column({
    name: 'detalle_pago',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  detalle_pago: string | null;

  @Column({
    type: 'enum',
    enum: MovimientoCajaOrigen,
    default: MovimientoCajaOrigen.MANUAL,
  })
  origen: MovimientoCajaOrigen;

  @Column({ name: 'cuenta_corriente_pago_id', type: 'int', nullable: true })
  cuenta_corriente_pago_id: number | null;

  @ManyToOne(() => CuentaCorrientePago, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'cuenta_corriente_pago_id' })
  cuentaCorrientePago: CuentaCorrientePago | null;

  @Column({ length: 500 })
  motivo: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacion: string | null;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' })
  usuario_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;

  @Column({ default: false })
  anulado: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  motivo_anulacion: string | null;

  @ManyToOne(() => Usuario, { nullable: true, eager: false })
  @JoinColumn({ name: 'anulado_por_id' })
  anulado_por: Usuario | null;

  @Column({ name: 'anulado_por_id', type: 'int', nullable: true })
  anulado_por_id: number | null;

  @Column({ type: 'timestamp', nullable: true })
  fecha_anulacion: Date | null;
}
