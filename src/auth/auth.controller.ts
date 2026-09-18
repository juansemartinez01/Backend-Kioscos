import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, UsuarioAutenticado } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Contrato idéntico al viejo: recibe { email, password }, devuelve
   * { access_token, user }. El tenant se resuelve del lado del server y viaja
   * dentro del token.
   *
   * `dto` está para que el ValidationPipe global valide el body; el usuario ya
   * viene resuelto por LocalAuthGuard en `req.user`.
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: Request, @Body() _dto: LoginDto) {
    return this.authService.login(req.user as UsuarioAutenticado);
  }

  @Get('me')
  me(@Req() req: Request) {
    return req.user;
  }

  /** Alias histórico de /auth/me. Se mantiene para no romper el front. */
  @Get('profile')
  profile(@Req() req: Request) {
    return req.user;
  }
}
