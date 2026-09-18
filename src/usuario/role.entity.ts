import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Tabla GLOBAL: sin tenant_id y sin RLS. Ver `roles.constants.ts`.
 * Los tres roles se siembran en la migración inicial.
 */
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60, unique: true })
  nombre: string;
}
