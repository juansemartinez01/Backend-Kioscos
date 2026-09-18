import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASS'),
        database: config.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,

        // synchronize SIEMPRE en false, sin excepción ni override por env.
        //
        // Este proyecto no puede usarlo: las políticas de RLS, el
        // `FORCE ROW LEVEL SECURITY` y el `DEFAULT current_setting(...)` de
        // tenant_id son DDL que TypeORM no conoce. Con synchronize prendido los
        // pisaría en cada arranque y el aislamiento se apagaría solo, sin
        // ningún error visible.
        //
        // (En el proyecto viejo esto salía de `shouldSynchronizeSchema()`, que
        // devolvía true salvo en Railway. Como el deploy se movió a EC2, hoy
        // está corriendo con synchronize activo en producción salvo que
        // DB_SYNCHRONIZE esté seteada a mano.)
        synchronize: false,

        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true',

        // El pool tiene que contemplar que cada request en vuelo retiene una
        // conexión durante toda su transacción (ver TenantTransactionInterceptor).
        extra: { max: config.get<number>('DB_POOL_MAX', 10) },

        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    TenancyModule,
    AuthModule,

    // TODO(fase-4): acá entran los 23 módulos de negocio del port.
  ],
})
export class AppModule {}
