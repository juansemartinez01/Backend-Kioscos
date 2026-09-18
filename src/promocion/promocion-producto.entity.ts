import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Promocion } from './promocion.entity';
import { Producto } from '../producto/producto.entity';

/** Un producto por promoción. */
@Index('uq_promo_producto_tenant', ['tenant_id', 'promocion', 'producto'], {
  unique: true,
})
@Entity('promocion_producto')
export class PromocionProducto extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Promocion, (promo) => promo.productos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'promocion_id' })
  promocion: Promocion;

  // TODO(fase-3): sacar el `eager` junto con el `relations` explícito en el
  // service. Hoy la respuesta trae el producto anidado; sacarlo solo acá
  // rompería el contrato del front en silencio.
  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  /** Piezas, para productos por unidad. */
  @Column({ type: 'int', nullable: true })
  cantidad: number | null;

  /** Gramos, para productos a granel. NUMERIC => string, por precisión. */
  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  cantidad_gramos: string | null;
}
