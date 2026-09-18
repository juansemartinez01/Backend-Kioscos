import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Producto } from '../producto/producto.entity';

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value == null ? null : Number(value)),
};

/**
 * Era `@Unique(['producto_id'])`. Queda compuesto con `tenant_id`: en la
 * práctica es equivalente (un producto_id pertenece a un solo tenant, porque el
 * serial es global), pero así el índice sirve además como índice de búsqueda
 * del tenant.
 */
@Index('uq_param_reorden_tenant_producto', ['tenant_id', 'producto_id'], {
  unique: true,
})
@Entity('parametros_reorden')
export class ParametroReorden extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'producto_id', type: 'int' })
  producto_id: number;

  // TODO(fase-3): sacar el `eager`. No se toca acá porque la respuesta actual
  // incluye el producto anidado: hay que sacarlo junto con el
  // `relations: ['producto']` explícito en el service, en el mismo commit, o se
  // rompe el contrato del front sin que nadie lo note.
  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({
    name: 'nivel_minimo',
    type: 'numeric',
    precision: 18,
    scale: 3,
    transformer: numericTransformer,
  })
  nivel_minimo: number;

  @Column({
    name: 'nivel_optimo',
    type: 'numeric',
    precision: 18,
    scale: 3,
    transformer: numericTransformer,
  })
  nivel_optimo: number;
}
