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
import { VentaItem } from './venta-item.entity';
import { Usuario } from '../usuario/usuario.entity';
import { IngresoVenta } from '../ingreso/ingreso-venta.entity';
import { Almacen } from '../almacen/almacen.entity';
import { VentaAjuste } from './venta-ajuste.entity';
import { TipoCobroVenta } from './venta-tipo-cobro.enum';

/**
 * La tabla más consultada del sistema, y la que más crece. Los dos índices
 * cubren lo que realmente se pide: las ventas del día y el filtro por estado.
 */
@Index('ix_venta_tenant_fecha', ['tenant_id', 'fecha'])
@Index('ix_venta_tenant_estado', ['tenant_id', 'estado'])
@Entity('venta')
export class Venta extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({
    name: 'total_descuentos',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalDescuentos: number;

  @Column({
    name: 'total_recargos',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalRecargos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: string;

  @Column({
    name: 'tipo_cobro',
    type: 'varchar',
    length: 30,
    default: TipoCobroVenta.CONTADO,
  })
  tipoCobro: TipoCobroVenta;

  @Column({ name: 'cuenta_corriente_id', type: 'int', nullable: true })
  cuentaCorrienteId: number | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.ventas, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  // TODO(fase-3): el `eager` de items fuerza el join en TODA consulta de venta,
  // incluidos los listados y los totales que no miran el detalle. Se saca junto
  // con el `relations: ['items']` explícito donde la respuesta sí los lleva.
  @OneToMany(() => VentaItem, (item) => item.venta, {
    cascade: true,
    eager: true,
  })
  items: VentaItem[];

  @OneToMany(() => VentaAjuste, (ajuste) => ajuste.venta, { cascade: true })
  ajustes: VentaAjuste[];

  @OneToMany(() => IngresoVenta, (ingreso) => ingreso.venta)
  ingresos: IngresoVenta[];

  @ManyToOne(() => Almacen, { nullable: false })
  @JoinColumn({ name: 'almacen_id' })
  almacen: Almacen;
}
