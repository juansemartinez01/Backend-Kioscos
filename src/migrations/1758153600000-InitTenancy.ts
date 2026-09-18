import { MigrationInterface, QueryRunner } from 'typeorm';
import { APP_ROLE_NAMES } from '../auth/roles.constants';
import {
  habilitarRls,
  sqlDeshabilitarRls,
  sqlHabilitarRlsUsuarios,
} from '../tenancy/rls';

/**
 * La lista va escrita acá adentro, no importada de `TABLAS_CON_TENANT`.
 *
 * Una migración es una foto de un momento: tiene que hacer siempre lo mismo,
 * hoy y dentro de un año. `TABLAS_CON_TENANT` crece con cada fase, así que si
 * esta migración la importara, al correrla en una base nueva intentaría prender
 * RLS sobre tablas que en este punto de la historia todavía no existen, y
 * fallaría con "relation does not exist".
 *
 * Las funciones (`habilitarRls`, `sqlHabilitarRlsUsuarios`) sí se importan: son
 * la política de aislamiento, y si esa política cambia, cambia con su propia
 * migración.
 */
const TABLAS_DE_ESTA_MIGRACION = ['usuario_rol'];

/**
 * Fase 1: el esqueleto multitenant.
 *
 * Crea `tenant`, `roles`, `usuarios` y `usuario_rol`, y deja el aislamiento
 * andando de punta a punta. Las 30 tablas de negocio llegan en la fase 2.
 */
export class InitTenancy1758153600000 implements MigrationInterface {
  name = 'InitTenancy1758153600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- tenant: catálogo raíz, sin tenant_id y sin RLS -------------------
    await queryRunner.query(`
      CREATE TABLE "tenant" (
        "id"        SERIAL PRIMARY KEY,
        "slug"      VARCHAR(60)  NOT NULL UNIQUE,
        "nombre"    VARCHAR(255) NOT NULL,
        "activo"    BOOLEAN      NOT NULL DEFAULT true,
        "creado_en" TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    // --- roles: global, compartido por todos los tenants ------------------
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id"     SERIAL PRIMARY KEY,
        "nombre" VARCHAR(60) NOT NULL UNIQUE
      )
    `);

    for (const nombre of APP_ROLE_NAMES) {
      await queryRunner.query(
        `INSERT INTO "roles" ("nombre") VALUES ($1) ON CONFLICT DO NOTHING`,
        [nombre],
      );
    }

    // --- usuarios ---------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id"         SERIAL PRIMARY KEY,
        "tenant_id"  INTEGER      NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "nombre"     VARCHAR(255) NOT NULL,
        "usuario"    VARCHAR(100) NOT NULL,
        "clave_hash" VARCHAR(255) NOT NULL,
        "email"      VARCHAR(255) NOT NULL,
        "activo"     BOOLEAN      NOT NULL DEFAULT true
      )
    `);

    // email único GLOBAL: es el identificador de login y se resuelve antes de
    // conocer el tenant. Sin este unique, dos tenants con el mismo email hacen
    // que el login entre al que Postgres devuelva primero.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_usuarios_email" ON "usuarios" (lower("email"))`,
    );

    // usuario único POR TENANT: cada cliente puede tener su propio "admin".
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_usuarios_tenant_usuario" ON "usuarios" ("tenant_id", "usuario")`,
    );

    // --- usuario_rol ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "usuario_rol" (
        "id"         SERIAL PRIMARY KEY,
        "tenant_id"  INTEGER NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "usuario_id" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
        "rol_id"     INTEGER NOT NULL REFERENCES "roles"("id")   ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_usuario_rol" ON "usuario_rol" ("usuario_id", "rol_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_usuario_rol_tenant_usuario" ON "usuario_rol" ("tenant_id", "usuario_id")`,
    );

    // --- RLS --------------------------------------------------------------
    // usuarios va aparte: su política incluye el escape del login.
    for (const sql of sqlHabilitarRlsUsuarios()) {
      await queryRunner.query(sql);
    }

    await habilitarRls(queryRunner, TABLAS_DE_ESTA_MIGRACION);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tabla of [...TABLAS_DE_ESTA_MIGRACION, 'usuarios']) {
      for (const sql of sqlDeshabilitarRls(tabla)) {
        await queryRunner.query(sql);
      }
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "usuario_rol"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usuarios"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant"`);
  }
}
