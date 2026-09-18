import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // getOrThrow, no `?? 'default_secret'`.
      //
      // El proyecto viejo tenía `configService.get('JWT_SECRET') || 'default_secret'`
      // en jwt.strategy.ts y `process.env.JWT_SECRET || 'defaultSecret'` en
      // constants.ts. Con eso, olvidarse la variable de entorno no rompe nada:
      // el server arranca y firma tokens con un secreto público conocido, que
      // cualquiera puede usar para forjar uno. Acá eso pasa a ser un tenant_id
      // forjado, así que el proceso directamente no arranca sin la variable.
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Lo que devuelve esto es `req.user`.
   *
   * El `tenant_id` va acá para que lo pueda leer `@TenantId()`, pero el
   * aislamiento NO depende de este valor: de eso se encarga el middleware, que
   * corre antes y verifica el token por su cuenta. Este es el mismo dato por
   * una segunda vía.
   */
  validate(payload: JwtPayload): {
    id: number;
    usuario: string;
    roles: string[];
    tenant_id: number;
  } {
    if (typeof payload.tenant_id !== 'number') {
      // Token viejo o mal formado. Sin tenant no hay nada que hacer.
      throw new UnauthorizedException('Token sin tenant');
    }

    return {
      id: payload.sub,
      usuario: payload.usuario,
      roles: payload.roles,
      tenant_id: payload.tenant_id,
    };
  }
}
