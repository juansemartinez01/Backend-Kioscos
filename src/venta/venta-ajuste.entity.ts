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
import { Venta } from './venta.entity';
import { Usuario } from '../usuario/usuario.entity';

export enum VentaAjusteTipo {
  DESCUENTO = 'DESCUENTO',
  RECARGO = 'RECARGO',
}

export enum VentaAjusteModo {
  PORCENTAJE = 'PORCENTAJE',
  MONTO = 'MONTO',
}

export enum VentaAjusteOrigen {
  MANUAL = 'MANUAL',
  REGLA = 'REGLA',
  MEDIO_PAGO = 'MEDIO_PAGO',
}

@Index('ix_venta_ajuste_tenant_venta', ['tenant_id', 'venta_id'])
@Entity('venta_ajuste')
export class VentaAjuste extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'venta_id', type: 'int' })
  venta_id: number;

  @ManyToOne(() => Venta, (venta) => venta.ajustes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ type: 'enum', enum: VentaAjusteTipo })
  tipo: VentaAjusteTipo;

  @Column({ type: 'enum', enum: VentaAjusteModo })
  modo: VentaAjusteModo;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ name: 'monto_aplicado', type: 'decimal', precision: 12, scale: 2 })
  montoAplicado: number;

  @Column({ type: 'varchar', length: 500 })
  motivo: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  codigo: string | null;

  @Column({
    type: 'enum',
    enum: VentaAjusteOrigen,
    default: VentaAjusteOrigen.MANUAL,
  })
  origen: VentaAjusteOrigen;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuario_id: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
