import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';

/**
 * `nombre` era UNIQUE global. Con una sola base compartida eso rompe al segundo
 * cliente: el primero que cree "Bebidas" se la bloquea a todos los demás.
 */
@Index('uq_categoria_tenant_nombre', ['tenant_id', 'nombre'], { unique: true })
@Entity('categoria')
export class Categoria extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;
}
