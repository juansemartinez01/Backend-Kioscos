import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { Role } from './role.entity';
import { Usuario } from './usuario.entity';

/**
 * La asignación SÍ es por tenant, aunque `roles` sea global: quién es Admin
 * depende de cada cliente.
 */
@Index('uq_usuario_rol', ['usuario_id', 'rol_id'], { unique: true })
@Index('ix_usuario_rol_tenant_usuario', ['tenant_id', 'usuario_id'])
@Entity('usuario_rol')
export class UsuarioRol extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_id', type: 'int' })
  usuario_id: number;

  @Column({ name: 'rol_id', type: 'int' })
  rol_id: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.roles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rol_id' })
  rol: Role;
}
