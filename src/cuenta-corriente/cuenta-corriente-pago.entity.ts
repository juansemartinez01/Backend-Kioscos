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
import { Almacen } from '../almacen/almacen.entity';
import { Usuario } from '../usuario/usuario.entity';
import { CuentaCorrientePagoAplicacion } from './cuenta-corriente-pago-aplicacion.entity';
import {
  MetodoPago,
  METODOS_PAGO_PERSISTIDOS,
} from '../common/metodo-pago.enum';

export enum CuentaCorrienteMedioPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  QR = 'QR',
  DEBITO = 'DEBITO',
  CREDITO = 'CREDITO',
  OTRO = 'OTRO',
  BANCARIZADO = 'BANCARIZADO',
}

/**
 * `(tenant_id, almacen_id, fecha)` es el índice del cierre de caja: los pagos
 * de cuenta corriente entran al arqueo del almacen y se suman por dia.
 */
@Index('ix_cc_pago_tenant_cuenta_fecha', [
  'tenant_id',
  'cuentaCorrienteId',
  'fecha',
])
@Index('ix_cc_pago_tenant_almacen_fecha', ['tenant_id', 'almacenId', 'fecha'])
@Entity('cuenta_corriente_pago')
export class CuentaCorrientePago extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cuenta_corriente_id', type: 'int' })
  cuentaCorrienteId: number;

  @ManyToOne(() => CuentaCorriente, (cuenta) => cuenta.pagos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cuenta_corriente_id' })
  cuentaCorriente: CuentaCorriente;

  @Column({ name: 'almacen_id', type: 'int' })
  almacenId: number;

  @ManyToOne(() => Almacen, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ name: 'medio_pago', type: 'enum', enum: METODOS_PAGO_PERSISTIDOS })
  medioPago: MetodoPago | 'BANCARIZADO';

  @Column({
    name: 'detalle_pago',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  detallePago: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  referencia: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacion: string | null;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @OneToMany(
    () => CuentaCorrientePagoAplicacion,
    (aplicacion) => aplicacion.pago,
  )
  aplicaciones: CuentaCorrientePagoAplicacion[];

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
