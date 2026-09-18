import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthLookupService } from './auth-lookup.service';

/** Lo que queda en `req.user` después del login local. */
export interface UsuarioAutenticado {
  id: number;
  tenant_id: number;
  usuario: string;
  nombre: string;
  email: string;
  activo: boolean;
  roles: string[];
}

export interface JwtPayload {
  sub: number;
  usuario: string;
  roles: string[];
  /** El tenant dueño de este usuario. Lo lee el TenantContextMiddleware. */
  tenant_id: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authLookup: AuthLookupService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Valida credenciales y resuelve el tenant.
   *
   * El email es el identificador de login y es único GLOBAL (ver la migración
   * inicial). Ese unique es nuevo: en el proyecto viejo `usuarios.email` estaba
   * declarado `unique: false` mientras el login autenticaba justamente por
   * email, así que dos filas con el mismo email hacían que entrara cualquiera de
   * las dos. Con varios tenants en la misma base eso sería entrar al tenant
   * equivocado.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UsuarioAutenticado | null> {
    const fila = await this.authLookup.buscarPorEmail(email);
    if (!fila) return null;
    if (!fila.activo) return null;

    // Un tenant dado de baja no puede operar aunque el usuario siga activo.
    if (!fila.tenant_activo) return null;

    const valido = await bcrypt.compare(password, fila.clave_hash);
    if (!valido) return null;

    const { clave_hash: _hash, tenant_activo: _tenantActivo, ...resto } = fila;
    return resto;
  }

  /**
   * Firma el JWT. El `tenant_id` va adentro del token.
   *
   * El contrato con el front NO cambia: sigue recibiendo `{ access_token, user }`
   * igual que antes. El tenant viaja dentro del token, que para el front es un
   * string opaco que reenvía en el header.
   */
  login(user: UsuarioAutenticado): {
    access_token: string;
    user: UsuarioAutenticado;
  } {
    const payload: JwtPayload = {
      sub: user.id,
      usuario: user.usuario,
      roles: user.roles,
      tenant_id: user.tenant_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token invalido');
    }
  }
}
