import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService, UsuarioAutenticado } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    // Mismos nombres de campo que el proyecto viejo: el front manda
    // { email, password } y no se entera de ningún cambio.
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(email: string, password: string): Promise<UsuarioAutenticado> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      // Mensaje único a propósito: no distingue entre usuario inexistente,
      // clave incorrecta, usuario inactivo y tenant dado de baja. Diferenciarlos
      // dejaría enumerar qué emails existen en la plataforma.
      throw new UnauthorizedException('Credenciales invalidas');
    }
    return user;
  }
}
