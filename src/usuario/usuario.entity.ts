import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOwnedEntity } from '../tenancy/tenant-owned.entity';
import { UsuarioRol } from './usuario-rol.entity';
import { Venta } from '../venta/venta.entity';

/**
 * Dos unicidades distintas, a propósito:
 *
 *   email   -> ÚNICO GLOBAL. Es el identificador de login, y el login corre
 *              antes de saber el tenant. Si dos tenants pudieran repetir email,
 *              no habría forma de decidir a cuál entrar.
 *              (En el proyecto viejo esta columna era `unique: false` aunque el
 *              login autenticaba por ella. Ya era un bug con un solo cliente.)
 *
 *   usuario -> ÚNICO POR TENANT. Es un nombre para mostrar y para operar, no
 *              autentica. Cada cliente puede tener su propio "admin".
 */
@Index('uq_usuarios_email', ['email'], { unique: true })
@Index('uq_usuarios_tenant_usuario', ['tenant_id', 'usuario'], { unique: true })
@Entity('usuarios')
export class Usuario extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nombre: string;

  @Column({ length: 100 })
  usuario: string;

  @Column({ name: 'clave_hash', length: 255 })
  clave_hash: string;

  @Column({ length: 255 })
  email: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => UsuarioRol, (usuarioRol) => usuarioRol.usuario)
  roles: UsuarioRol[];

  @OneToMany(() => Venta, (venta) => venta.usuario)
  ventas: Venta[];
}
