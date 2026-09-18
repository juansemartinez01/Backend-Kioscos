import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Excepción al JwtAuthGuard global.
 *
 * Una ruta @Public() corre SIN contexto de tenant, así que no puede leer ni
 * escribir tablas con dueño: RLS se lo impide en el motor. Si una ruta pública
 * necesita tocar datos de un tenant, está mal marcada.
 *
 * En el proyecto viejo `POST /usuarios` era @Public(): cualquiera sin
 * autenticar creaba usuarios. Acá eso ya no funcionaría ni queriendo — el
 * INSERT no tendría tenant que poner en el DEFAULT y fallaría.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
