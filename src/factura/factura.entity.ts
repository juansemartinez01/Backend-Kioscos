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
import { FacturaVentaItem } from './factura-venta-item.entity';

/**
 * `cuit_emisor` pasa a ser por tenant de hecho: cada cliente factura con el
 * suyo. Conviene que salga de la configuración del tenant y no del body, pero
 * eso es fase 5 (contratos) — acá se porta tal cual está.
 */
@Index('ix_facturas_tenant_fecha', ['tenant_id', 'fecha'])
@Entity('facturas')
export class Factura extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  cuit_emisor: number;

  @Column('decimal', { precision: 12, scale: 2 })
  importe_total: number;

  @Column()
  punto_venta: number;

  @Column()
  factura_tipo: number;

  @Column()
  metodo_pago: number;

  @Column({ default: false })
  test: boolean;

  @Column({ nullable: true })
  cae: string;

  @Column({ type: 'timestamp', nullable: true })
  vencimiento_cae: Date;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @OneToMany(() => FacturaVentaItem, (fvi) => fvi.factura, { cascade: true })
  items: FacturaVentaItem[];
}
