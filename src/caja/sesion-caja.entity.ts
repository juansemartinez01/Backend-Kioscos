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
import { Usuario } from '../usuario/usuario.entity';
import { Almacen } from '../almacen/almacen.entity';
import { MovimientoCaja } from './movimiento-caja.entity';

/**
 * `(tenant_id, almacen_id, estado)` cubre la consulta que corre en cada
 * operación del POS: cuál es la caja ABIERTA de este almacén.
 */
@Index('ix_sesion_caja_tenant_almacen_estado', [
  'tenant_id',
  'almacen_id',
  'estado',
])
@Index('ix_sesion_caja_tenant_apertura', ['tenant_id', 'fecha_apertura'])
@Entity('sesion_caja')
export class SesionCaja extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Almacen, { nullable: false, eager: false })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;

  @Column({ name: 'almacen_id' })
  almacen_id: number;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' })
  usuario_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_inicial: number;

  @Column({ type: 'enum', enum: ['ABIERTA', 'CERRADA'], default: 'ABIERTA' })
  estado: 'ABIERTA' | 'CERRADA';

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacion: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_apertura: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_cierre: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  efectivo_contado: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia: number | null;

  @OneToMany(() => MovimientoCaja, (mov) => mov.caja)
  movimientos: MovimientoCaja[];
}
