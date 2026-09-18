import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Tabla raíz del multitenancy. NO lleva tenant_id ni RLS: es el catálogo de
 * tenants y solo se toca desde el flujo de alta, que corre fuera del contexto
 * de un tenant.
 */
@Entity('tenant')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  /** Identificador corto y estable, para logs, backups y nombres de recursos. */
  @Column({ length: 60, unique: true })
  slug: string;

  @Column({ length: 255 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creado_en: Date;
}
