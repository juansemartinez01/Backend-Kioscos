import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // CORS por configuración, no hardcodeado.
  //
  // En el proyecto viejo era un array fijo de 5 orígenes dentro de main.ts, así
  // que sumar un cliente implicaba tocar código y redeployar. Con un origen por
  // tenant eso no escala.
  const origins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    credentials: true,
  });

  // ValidationPipe GLOBAL.
  //
  // En el proyecto viejo estaba importado en main.ts pero nunca se aplicaba:
  // solo 4 de 23 controllers lo tenían vía @UsePipes, o sea que la mayoría de
  // los endpoints aceptaba cualquier body. `forbidNonWhitelisted` además corta
  // el envío de campos de más, que es por donde entraría un tenant_id a mano.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));

  await app.listen(config.get<number>('PORT', 3000));
}

void bootstrap();
