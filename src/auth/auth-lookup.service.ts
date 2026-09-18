import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AUTH_LOOKUP_SETTING } from '../tenancy/rls';

export interface UsuarioParaLogin {
  id: number;
  tenant_id: number;
  usuario: string;
  nombre: string;
  email: string;
  clave_hash: string;
  activo: boolean;
  tenant_activo: boolean;
  roles: string[];
}

/**
 * El ÚNICO lugar del sistema autorizado a leer usuarios sin contexto de tenant.
 *
 * Existe por el huevo y la gallina del login: para saber a qué tenant pertenece
 * quien se está logueando hay que buscarlo primero, y en ese momento todavía no
 * hay token del cual sacar el tenant.
 *
 * Contención del escape:
 *   - transacción propia, abierta y cerrada acá adentro
 *   - `SET LOCAL`, así que el permiso muere con la transacción
 *   - una sola consulta, por email exacto
 *   - devuelve el hash pero nunca lo expone fuera de AuthService
 *
 * Si algún día hay un segundo lugar que necesite prender `app.auth_lookup`,
 * casi seguro está mal planteado: lo que se necesita es contexto de tenant.
 */
@Injectable()
export class AuthLookupService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async buscarPorEmail(email: string): Promise<UsuarioParaLogin | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('SELECT set_config($1, $2, true)', [
        AUTH_LOOKUP_SETTING,
        'on',
      ]);

      const filas = await queryRunner.query(
        `SELECT u.id,
                u.tenant_id,
                u.usuario,
                u.nombre,
                u.email,
                u.clave_hash,
                u.activo,
                t.activo AS tenant_activo,
                COALESCE(
                  ARRAY_AGG(r.nombre) FILTER (WHERE r.nombre IS NOT NULL),
                  '{}'
                ) AS roles
           FROM usuarios u
           JOIN tenant t ON t.id = u.tenant_id
           LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
           LEFT JOIN roles r ON r.id = ur.rol_id
          WHERE lower(u.email) = lower($1)
          GROUP BY u.id, t.activo
          LIMIT 1`,
        [email],
      );

      await queryRunner.commitTransaction();
      return filas[0] ?? null;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
