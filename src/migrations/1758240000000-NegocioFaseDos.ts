import { MigrationInterface, QueryRunner } from 'typeorm';
import { habilitarRls, sqlDeshabilitarRls } from '../tenancy/rls';

/**
 * Fase 2: las 30 tablas de negocio.
 *
 * Tres cosas que conviene saber antes de leerla:
 *
 * 1. Toda tabla lleva `tenant_id INTEGER NOT NULL REFERENCES tenant(id)`. El
 *    DEFAULT que lo completa solo no se escribe acá: lo pone `habilitarRls()`
 *    al final, junto con la política y el FORCE. Están en el mismo lugar a
 *    propósito, porque son la misma decisión.
 *
 * 2. Los ids siguen siendo SERIAL globales, no por tenant. Por eso las claves
 *    primarias no llevan `tenant_id` y las foráneas no son compuestas: un id ya
 *    identifica una fila sin ambigüedad. Lo que cambia son las unicidades de
 *    negocio (sku, barcode, código de promo, nombre de categoría), que pasan a
 *    ser únicas POR TENANT: el código de barras de una Coca es el mismo para
 *    todos los clientes, y un UNIQUE global rechazaría el alta legítima del
 *    segundo.
 *
 * 3. `orden_compra` y `gasto` se apuntan mutuamente. La foránea de
 *    `orden_compra.gasto_id` se agrega con un ALTER después de crear `gasto`,
 *    que es la única forma de cerrar el ciclo.
 *
 * La lista de tablas va escrita adentro y no importada de `TABLAS_CON_TENANT`:
 * ver el comentario en rls.ts. Una migración es una foto de un momento.
 */
const TABLAS_DE_ESTA_MIGRACION = [
  'unidad',
  'categoria',
  'proveedor',
  'almacen',
  'producto',
  'producto_precio_almacen',
  'producto_precio_historial',
  'stock_actual',
  'parametros_reorden',
  'gasto_categoria',
  'orden_compra',
  'gasto',
  'orden_compra_item',
  'movimiento_stock',
  'promocion',
  'promocion_producto',
  'venta',
  'venta_item',
  'venta_ajuste',
  'ingreso_venta',
  'facturas',
  'factura_venta_item',
  'sesion_caja',
  'cuenta_corriente',
  'cuenta_corriente_venta',
  'cuenta_corriente_pago',
  'cuenta_corriente_pago_aplicacion',
  'cuenta_corriente_movimiento',
  'movimiento_caja',
  'extraccion_ingreso',
];

const MEDIOS_PAGO = `'EFECTIVO', 'TRANSFERENCIA', 'QR', 'DEBITO', 'CREDITO', 'OTRO', 'BANCARIZADO'`;

export class NegocioFaseDos1758240000000 implements MigrationInterface {
  name = 'NegocioFaseDos1758240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // ================================================================
    // tipos enumerados
    // ================================================================
    await q(
      `CREATE TYPE "orden_compra_estado_enum" AS ENUM ('ACTIVA', 'ANULADA')`,
    );
    await q(
      `CREATE TYPE "gasto_origen_enum" AS ENUM ('MANUAL', 'ORDEN_COMPRA')`,
    );
    await q(
      `CREATE TYPE "venta_ajuste_tipo_enum" AS ENUM ('DESCUENTO', 'RECARGO')`,
    );
    await q(
      `CREATE TYPE "venta_ajuste_modo_enum" AS ENUM ('PORCENTAJE', 'MONTO')`,
    );
    await q(
      `CREATE TYPE "venta_ajuste_origen_enum" AS ENUM ('MANUAL', 'REGLA', 'MEDIO_PAGO')`,
    );
    await q(`CREATE TYPE "ingreso_venta_tipo_enum" AS ENUM (${MEDIOS_PAGO})`);
    await q(
      `CREATE TYPE "sesion_caja_estado_enum" AS ENUM ('ABIERTA', 'CERRADA')`,
    );
    await q(
      `CREATE TYPE "movimiento_caja_tipo_enum" AS ENUM ('INGRESO', 'EGRESO', 'RETIRO')`,
    );
    await q(
      `CREATE TYPE "movimiento_caja_medio_pago_enum" AS ENUM (${MEDIOS_PAGO})`,
    );
    await q(
      `CREATE TYPE "movimiento_caja_origen_enum" AS ENUM ('MANUAL', 'CUENTA_CORRIENTE')`,
    );
    await q(
      `CREATE TYPE "extraccion_ingreso_origen_enum" AS ENUM ('EFECTIVO', 'BANCARIZADO')`,
    );
    await q(
      `CREATE TYPE "cuenta_corriente_venta_estado_enum" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADA', 'ANULADA')`,
    );
    await q(
      `CREATE TYPE "cuenta_corriente_pago_medio_pago_enum" AS ENUM (${MEDIOS_PAGO})`,
    );
    await q(
      `CREATE TYPE "cuenta_corriente_movimiento_tipo_enum" AS ENUM ('DEUDA', 'PAGO', 'AJUSTE_DEBITO', 'AJUSTE_CREDITO', 'SALDO_A_FAVOR')`,
    );

    // ================================================================
    // catálogo
    // ================================================================
    await q(`
      CREATE TABLE "unidad" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_id"   INTEGER     NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "nombre"      VARCHAR(50) NOT NULL,
        "abreviatura" VARCHAR(20)
      )
    `);
    await q(`CREATE INDEX "ix_unidad_tenant" ON "unidad" ("tenant_id")`);

    await q(`
      CREATE TABLE "categoria" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_id"   INTEGER      NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "nombre"      VARCHAR(100) NOT NULL,
        "descripcion" TEXT
      )
    `);
    await q(
      `CREATE UNIQUE INDEX "uq_categoria_tenant_nombre" ON "categoria" ("tenant_id", "nombre")`,
    );

    await q(`
      CREATE TABLE "proveedor" (
        "id"        SERIAL PRIMARY KEY,
        "tenant_id" INTEGER      NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "nombre"    VARCHAR(255) NOT NULL,
        "contacto"  VARCHAR(255),
        "telefono"  VARCHAR(50),
        "email"     VARCHAR(100)
      )
    `);
    await q(`CREATE INDEX "ix_proveedor_tenant" ON "proveedor" ("tenant_id")`);

    await q(`
      CREATE TABLE "almacen" (
        "id"        SERIAL PRIMARY KEY,
        "tenant_id" INTEGER      NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "nombre"    VARCHAR(100) NOT NULL,
        "ubicacion" VARCHAR(255),
        "capacidad" INTEGER
      )
    `);
    await q(`CREATE INDEX "ix_almacen_tenant" ON "almacen" ("tenant_id")`);

    await q(`
      CREATE TABLE "producto" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_id"         INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "sku"               VARCHAR(50)   NOT NULL,
        "nombre"            VARCHAR(255)  NOT NULL,
        "descripcion"       TEXT,
        "unidad_id"         INTEGER       NOT NULL REFERENCES "unidad"("id"),
        "categoria_id"      INTEGER       REFERENCES "categoria"("id"),
        "created_at"        TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP     NOT NULL DEFAULT now(),
        "barcode"           VARCHAR(100),
        "precioBase"        DECIMAL(12,2) NOT NULL DEFAULT 0,
        "activo"            BOOLEAN       NOT NULL DEFAULT true,
        "es_por_gramos"     BOOLEAN       NOT NULL DEFAULT false,
        "inOferta"          BOOLEAN       NOT NULL DEFAULT false,
        "precio_updated_at" TIMESTAMPTZ,
        "proveedorNombre"   VARCHAR(255)
      )
    `);
    // sku y barcode: únicos POR TENANT, no globales. Ver el punto 2 de arriba.
    await q(
      `CREATE UNIQUE INDEX "uq_producto_tenant_sku" ON "producto" ("tenant_id", "sku")`,
    );
    await q(
      `CREATE UNIQUE INDEX "uq_producto_tenant_barcode" ON "producto" ("tenant_id", "barcode")`,
    );
    await q(
      `CREATE INDEX "ix_producto_tenant_categoria" ON "producto" ("tenant_id", "categoria_id")`,
    );

    // ================================================================
    // precios y stock
    // ================================================================
    await q(`
      CREATE TABLE "producto_precio_almacen" (
        "tenant_id"     INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "producto_id"   INTEGER       NOT NULL REFERENCES "producto"("id") ON DELETE CASCADE,
        "almacen_id"    INTEGER       NOT NULL REFERENCES "almacen"("id") ON DELETE CASCADE,
        "precio"        NUMERIC(12,2) NOT NULL,
        "inOferta"      BOOLEAN       NOT NULL DEFAULT false,
        "precio_oferta" NUMERIC(12,2),
        "moneda"        VARCHAR(10)   NOT NULL DEFAULT 'ARS',
        "updated_at"    TIMESTAMPTZ   DEFAULT now(),
        PRIMARY KEY ("producto_id", "almacen_id")
      )
    `);
    await q(
      `CREATE INDEX "ix_ppa_tenant_almacen" ON "producto_precio_almacen" ("tenant_id", "almacen_id")`,
    );

    await q(`
      CREATE TABLE "producto_precio_historial" (
        "id"              SERIAL PRIMARY KEY,
        "tenant_id"       INTEGER     NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "producto_id"     INTEGER     NOT NULL REFERENCES "producto"("id") ON DELETE CASCADE,
        "almacen_id"      INTEGER     REFERENCES "almacen"("id") ON DELETE SET NULL,
        "tipo"            VARCHAR(30) NOT NULL,
        "precio_anterior" NUMERIC(12,2),
        "precio_nuevo"    NUMERIC(12,2),
        "usuario_id"      VARCHAR(80),
        "usuario_nombre"  VARCHAR(200),
        "origen"          VARCHAR(80),
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_precio_hist_tenant_prod_fecha" ON "producto_precio_historial" ("tenant_id", "producto_id", "created_at")`,
    );
    await q(
      `CREATE INDEX "ix_precio_hist_tenant_alm_fecha" ON "producto_precio_historial" ("tenant_id", "almacen_id", "created_at")`,
    );
    await q(
      `CREATE INDEX "ix_precio_hist_tenant_tipo_fecha" ON "producto_precio_historial" ("tenant_id", "tipo", "created_at")`,
    );

    // La PK es (producto_id, almacen_id) y NO incluye tenant_id, a propósito:
    // hay dos upserts en SQL crudo que hacen ON CONFLICT (producto_id,
    // almacen_id). Si algún día se le agrega tenant_id a esta clave, esos
    // upserts dejan de matchear y NO fallan: insertan duplicados en silencio.
    await q(`
      CREATE TABLE "stock_actual" (
        "tenant_id"       INTEGER   NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "producto_id"     INTEGER   NOT NULL REFERENCES "producto"("id"),
        "almacen_id"      INTEGER   NOT NULL REFERENCES "almacen"("id"),
        "cantidad"        INTEGER   NOT NULL,
        "last_updated"    TIMESTAMP NOT NULL DEFAULT now(),
        "cantidad_gramos" NUMERIC(18,3),
        PRIMARY KEY ("producto_id", "almacen_id")
      )
    `);
    await q(
      `CREATE INDEX "ix_stock_actual_tenant_almacen" ON "stock_actual" ("tenant_id", "almacen_id")`,
    );

    await q(`
      CREATE TABLE "parametros_reorden" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_id"    INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "producto_id"  INTEGER       NOT NULL REFERENCES "producto"("id"),
        "nivel_minimo" NUMERIC(18,3) NOT NULL,
        "nivel_optimo" NUMERIC(18,3) NOT NULL
      )
    `);
    await q(
      `CREATE UNIQUE INDEX "uq_param_reorden_tenant_producto" ON "parametros_reorden" ("tenant_id", "producto_id")`,
    );

    // ================================================================
    // compras y gastos
    // ================================================================
    await q(`
      CREATE TABLE "gasto_categoria" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_id"   INTEGER      NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "nombre"      VARCHAR(100) NOT NULL,
        "descripcion" VARCHAR(255),
        "activo"      BOOLEAN      NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE UNIQUE INDEX "uq_gasto_categoria_tenant_nombre" ON "gasto_categoria" ("tenant_id", "nombre")`,
    );

    // gasto_id queda sin foránea hasta que exista "gasto" (ver el ALTER abajo).
    await q(`
      CREATE TABLE "orden_compra" (
        "id"                 SERIAL PRIMARY KEY,
        "tenant_id"          INTEGER   NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "fecha"              TIMESTAMP NOT NULL,
        "almacen_id"         INTEGER   DEFAULT NULL,
        "total"              NUMERIC,
        "estado"             "orden_compra_estado_enum" NOT NULL DEFAULT 'ACTIVA',
        "gasto_id"           INTEGER,
        "numero_comprobante" VARCHAR(120),
        "observacion"        TEXT,
        "motivo_anulacion"   VARCHAR(500),
        "fecha_anulacion"    TIMESTAMP,
        "proveedor_id"       INTEGER   NOT NULL REFERENCES "proveedor"("id"),
        CONSTRAINT "uq_orden_compra_gasto" UNIQUE ("gasto_id")
      )
    `);
    await q(
      `CREATE INDEX "ix_orden_compra_tenant_fecha" ON "orden_compra" ("tenant_id", "fecha")`,
    );
    await q(
      `CREATE INDEX "ix_orden_compra_tenant_estado" ON "orden_compra" ("tenant_id", "estado")`,
    );

    await q(`
      CREATE TABLE "gasto" (
        "id"              SERIAL PRIMARY KEY,
        "tenant_id"       INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "fecha"           DATE          NOT NULL,
        "monto"           NUMERIC(14,2) NOT NULL,
        "descripcion"     VARCHAR(255)  NOT NULL,
        "notas"           TEXT,
        "categoria_id"    INTEGER       REFERENCES "gasto_categoria"("id") ON DELETE SET NULL,
        "almacen_id"      INTEGER       REFERENCES "almacen"("id") ON DELETE SET NULL,
        "origen"          "gasto_origen_enum" NOT NULL DEFAULT 'MANUAL',
        "orden_compra_id" INTEGER       REFERENCES "orden_compra"("id") ON DELETE SET NULL,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMPTZ
      )
    `);
    await q(
      `CREATE INDEX "idx_gasto_tenant_fecha" ON "gasto" ("tenant_id", "fecha")`,
    );
    await q(
      `CREATE INDEX "idx_gasto_tenant_monto" ON "gasto" ("tenant_id", "monto")`,
    );
    await q(
      `CREATE INDEX "idx_gasto_tenant_categoria" ON "gasto" ("tenant_id", "categoria_id")`,
    );
    await q(
      `CREATE INDEX "idx_gasto_tenant_almacen" ON "gasto" ("tenant_id", "almacen_id")`,
    );

    // Recién ahora se puede cerrar el ciclo orden_compra <-> gasto.
    await q(`
      ALTER TABLE "orden_compra"
        ADD CONSTRAINT "fk_orden_compra_gasto"
        FOREIGN KEY ("gasto_id") REFERENCES "gasto"("id") ON DELETE SET NULL
    `);

    await q(`
      CREATE TABLE "orden_compra_item" (
        "id"                SERIAL PRIMARY KEY,
        "tenant_id"         INTEGER NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cantidad"          INTEGER,
        "cantidad_gramos"   NUMERIC(12,3),
        "precioUnitario"    NUMERIC NOT NULL,
        "subtotal"          NUMERIC NOT NULL,
        "fecha_vencimiento" DATE,
        "orden_compra_id"   INTEGER REFERENCES "orden_compra"("id") ON DELETE CASCADE,
        "producto_id"       INTEGER NOT NULL REFERENCES "producto"("id")
      )
    `);
    await q(
      `CREATE INDEX "ix_oc_item_tenant_orden" ON "orden_compra_item" ("tenant_id", "orden_compra_id")`,
    );

    await q(`
      CREATE TABLE "movimiento_stock" (
        "id"                   SERIAL PRIMARY KEY,
        "tenant_id"            INTEGER     NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "producto_id"          INTEGER     NOT NULL REFERENCES "producto"("id"),
        "origen_almacen"       INTEGER     REFERENCES "almacen"("id"),
        "destino_almacen"      INTEGER     REFERENCES "almacen"("id"),
        "cantidad"             INTEGER,
        "cantidad_gramos"      NUMERIC(18,3),
        "tipo"                 VARCHAR(20) NOT NULL,
        "fecha"                TIMESTAMP   NOT NULL DEFAULT now(),
        "usuario_id"           INTEGER,
        "motivo"               TEXT,
        "proveedor_id"         INTEGER     REFERENCES "proveedor"("id"),
        "precio_unitario"      DECIMAL(12,2),
        "precio_total"         DECIMAL(12,2),
        "orden_compra_id"      INTEGER     REFERENCES "orden_compra"("id") ON DELETE SET NULL,
        "orden_compra_item_id" INTEGER     REFERENCES "orden_compra_item"("id") ON DELETE SET NULL
      )
    `);
    await q(
      `CREATE INDEX "ix_mov_stock_tenant_fecha" ON "movimiento_stock" ("tenant_id", "fecha")`,
    );
    await q(
      `CREATE INDEX "ix_mov_stock_tenant_producto_fecha" ON "movimiento_stock" ("tenant_id", "producto_id", "fecha")`,
    );

    // ================================================================
    // promociones
    // ================================================================
    await q(`
      CREATE TABLE "promocion" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_id"   INTEGER   NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "codigo"      VARCHAR   NOT NULL,
        "precioPromo" DECIMAL   NOT NULL,
        "almacen_id"  INTEGER   REFERENCES "almacen"("id") ON DELETE SET NULL,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "activo"      BOOLEAN   NOT NULL DEFAULT true
      )
    `);
    await q(
      `CREATE UNIQUE INDEX "uq_promocion_tenant_codigo" ON "promocion" ("tenant_id", "codigo")`,
    );
    await q(
      `CREATE INDEX "idx_promocion_tenant_almacen" ON "promocion" ("tenant_id", "almacen_id")`,
    );

    await q(`
      CREATE TABLE "promocion_producto" (
        "id"              SERIAL PRIMARY KEY,
        "tenant_id"       INTEGER NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cantidad"        INTEGER,
        "cantidad_gramos" NUMERIC(12,3),
        "promocion_id"    INTEGER REFERENCES "promocion"("id") ON DELETE CASCADE,
        "producto_id"     INTEGER REFERENCES "producto"("id")
      )
    `);
    await q(
      `CREATE UNIQUE INDEX "uq_promo_producto_tenant" ON "promocion_producto" ("tenant_id", "promocion_id", "producto_id")`,
    );

    // ================================================================
    // ventas
    // ================================================================
    // cuenta_corriente_id es una columna suelta, sin foránea: así estaba en el
    // proyecto viejo, y ponerle la FK haría un segundo ciclo con
    // cuenta_corriente_venta.
    await q(`
      CREATE TABLE "venta" (
        "id"                  SERIAL PRIMARY KEY,
        "tenant_id"           INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "fecha"               TIMESTAMP     NOT NULL DEFAULT now(),
        "subtotal"            DECIMAL(12,2) NOT NULL DEFAULT 0,
        "total_descuentos"    DECIMAL(12,2) NOT NULL DEFAULT 0,
        "total_recargos"      DECIMAL(12,2) NOT NULL DEFAULT 0,
        "total"               DECIMAL(12,2) NOT NULL,
        "estado"              VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE',
        "tipo_cobro"          VARCHAR(30)   NOT NULL DEFAULT 'CONTADO',
        "cuenta_corriente_id" INTEGER,
        "usuario_id"          INTEGER       REFERENCES "usuarios"("id"),
        "almacen_id"          INTEGER       NOT NULL REFERENCES "almacen"("id")
      )
    `);
    await q(
      `CREATE INDEX "ix_venta_tenant_fecha" ON "venta" ("tenant_id", "fecha")`,
    );
    await q(
      `CREATE INDEX "ix_venta_tenant_estado" ON "venta" ("tenant_id", "estado")`,
    );

    await q(`
      CREATE TABLE "venta_item" (
        "id"              SERIAL PRIMARY KEY,
        "tenant_id"       INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cantidad"        INTEGER,
        "cantidad_gramos" NUMERIC(12,3),
        "precioUnitario"  DECIMAL(12,2) NOT NULL,
        "subtotal"        DECIMAL(12,2) NOT NULL,
        "venta_id"        INTEGER       REFERENCES "venta"("id"),
        "producto_id"     INTEGER       REFERENCES "producto"("id")
      )
    `);
    await q(
      `CREATE INDEX "ix_venta_item_tenant_venta" ON "venta_item" ("tenant_id", "venta_id")`,
    );

    await q(`
      CREATE TABLE "venta_ajuste" (
        "id"             SERIAL PRIMARY KEY,
        "tenant_id"      INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "venta_id"       INTEGER       NOT NULL REFERENCES "venta"("id") ON DELETE CASCADE,
        "tipo"           "venta_ajuste_tipo_enum"   NOT NULL,
        "modo"           "venta_ajuste_modo_enum"   NOT NULL,
        "valor"          DECIMAL(12,2) NOT NULL,
        "monto_aplicado" DECIMAL(12,2) NOT NULL,
        "motivo"         VARCHAR(500)  NOT NULL,
        "codigo"         VARCHAR(80),
        "origen"         "venta_ajuste_origen_enum" NOT NULL DEFAULT 'MANUAL',
        "usuario_id"     INTEGER       REFERENCES "usuarios"("id"),
        "fecha"          TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_venta_ajuste_tenant_venta" ON "venta_ajuste" ("tenant_id", "venta_id")`,
    );

    await q(`
      CREATE TABLE "ingreso_venta" (
        "id"           SERIAL PRIMARY KEY,
        "tenant_id"    INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "tipo"         "ingreso_venta_tipo_enum" NOT NULL,
        "monto"        DECIMAL(12,2) NOT NULL,
        "detalle_pago" VARCHAR(120),
        "fecha"        TIMESTAMP     NOT NULL DEFAULT now(),
        "venta_id"     INTEGER       REFERENCES "venta"("id") ON DELETE CASCADE
      )
    `);
    await q(
      `CREATE INDEX "ix_ingreso_venta_tenant_fecha" ON "ingreso_venta" ("tenant_id", "fecha")`,
    );
    await q(
      `CREATE INDEX "ix_ingreso_venta_tenant_venta" ON "ingreso_venta" ("tenant_id", "venta_id")`,
    );

    // ================================================================
    // facturación
    // ================================================================
    await q(`
      CREATE TABLE "facturas" (
        "id"              SERIAL PRIMARY KEY,
        "tenant_id"       INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cuit_emisor"     BIGINT        NOT NULL,
        "importe_total"   DECIMAL(12,2) NOT NULL,
        "punto_venta"     INTEGER       NOT NULL,
        "factura_tipo"    INTEGER       NOT NULL,
        "metodo_pago"     INTEGER       NOT NULL,
        "test"            BOOLEAN       NOT NULL DEFAULT false,
        "cae"             VARCHAR,
        "vencimiento_cae" TIMESTAMP,
        "fecha"           TIMESTAMP     NOT NULL DEFAULT now(),
        "usuario_id"      INTEGER       REFERENCES "usuarios"("id")
      )
    `);
    await q(
      `CREATE INDEX "ix_facturas_tenant_fecha" ON "facturas" ("tenant_id", "fecha")`,
    );

    await q(`
      CREATE TABLE "factura_venta_item" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_id"     INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cantidad"      INTEGER       NOT NULL,
        "subtotal"      DECIMAL(12,2) NOT NULL,
        "factura_id"    INTEGER       REFERENCES "facturas"("id") ON DELETE CASCADE,
        "venta_item_id" INTEGER       REFERENCES "venta_item"("id")
      )
    `);
    await q(
      `CREATE INDEX "ix_factura_item_tenant_factura" ON "factura_venta_item" ("tenant_id", "factura_id")`,
    );

    // ================================================================
    // caja
    // ================================================================
    await q(`
      CREATE TABLE "sesion_caja" (
        "id"               SERIAL PRIMARY KEY,
        "tenant_id"        INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "almacen_id"       INTEGER       NOT NULL REFERENCES "almacen"("id"),
        "usuario_id"       INTEGER       NOT NULL REFERENCES "usuarios"("id"),
        "monto_inicial"    DECIMAL(12,2) NOT NULL,
        "estado"           "sesion_caja_estado_enum" NOT NULL DEFAULT 'ABIERTA',
        "observacion"      VARCHAR(500),
        "fecha_apertura"   TIMESTAMP     NOT NULL DEFAULT now(),
        "fecha_cierre"     TIMESTAMP,
        "efectivo_contado" DECIMAL(12,2),
        "diferencia"       DECIMAL(12,2)
      )
    `);
    // Cubre la consulta que corre en cada operación del POS: cuál es la caja
    // ABIERTA de este almacén.
    await q(
      `CREATE INDEX "ix_sesion_caja_tenant_almacen_estado" ON "sesion_caja" ("tenant_id", "almacen_id", "estado")`,
    );
    await q(
      `CREATE INDEX "ix_sesion_caja_tenant_apertura" ON "sesion_caja" ("tenant_id", "fecha_apertura")`,
    );

    // ================================================================
    // cuenta corriente
    // ================================================================
    await q(`
      CREATE TABLE "cuenta_corriente" (
        "id"            SERIAL PRIMARY KEY,
        "tenant_id"     INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "nombre"        VARCHAR(255)  NOT NULL,
        "documento"     VARCHAR(50),
        "email"         VARCHAR(255),
        "telefono"      VARCHAR(50),
        "activa"        BOOLEAN       NOT NULL DEFAULT true,
        "saldo_actual"  DECIMAL(12,2) NOT NULL DEFAULT 0,
        "observaciones" TEXT,
        "created_at"    TIMESTAMP     NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_cuenta_corriente_tenant_activa" ON "cuenta_corriente" ("tenant_id", "activa")`,
    );
    await q(
      `CREATE INDEX "ix_cuenta_corriente_tenant_documento" ON "cuenta_corriente" ("tenant_id", "documento")`,
    );

    await q(`
      CREATE TABLE "cuenta_corriente_venta" (
        "id"                  SERIAL PRIMARY KEY,
        "tenant_id"           INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cuenta_corriente_id" INTEGER       NOT NULL REFERENCES "cuenta_corriente"("id") ON DELETE CASCADE,
        "venta_id"            INTEGER       NOT NULL REFERENCES "venta"("id") ON DELETE RESTRICT,
        "monto_original"      DECIMAL(12,2) NOT NULL,
        "monto_pagado"        DECIMAL(12,2) NOT NULL DEFAULT 0,
        "monto_pendiente"     DECIMAL(12,2) NOT NULL,
        "estado"              "cuenta_corriente_venta_estado_enum" NOT NULL DEFAULT 'PENDIENTE',
        "fecha"               TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_cc_venta_tenant_cuenta_estado" ON "cuenta_corriente_venta" ("tenant_id", "cuenta_corriente_id", "estado")`,
    );
    await q(
      `CREATE INDEX "ix_cc_venta_tenant_venta" ON "cuenta_corriente_venta" ("tenant_id", "venta_id")`,
    );

    await q(`
      CREATE TABLE "cuenta_corriente_pago" (
        "id"                  SERIAL PRIMARY KEY,
        "tenant_id"           INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cuenta_corriente_id" INTEGER       NOT NULL REFERENCES "cuenta_corriente"("id") ON DELETE CASCADE,
        "almacen_id"          INTEGER       NOT NULL REFERENCES "almacen"("id") ON DELETE RESTRICT,
        "monto"               DECIMAL(12,2) NOT NULL,
        "medio_pago"          "cuenta_corriente_pago_medio_pago_enum" NOT NULL,
        "detalle_pago"        VARCHAR(120),
        "referencia"          VARCHAR(120),
        "observacion"         VARCHAR(500),
        "usuario_id"          INTEGER       REFERENCES "usuarios"("id") ON DELETE SET NULL,
        "fecha"               TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_cc_pago_tenant_cuenta_fecha" ON "cuenta_corriente_pago" ("tenant_id", "cuenta_corriente_id", "fecha")`,
    );
    await q(
      `CREATE INDEX "ix_cc_pago_tenant_almacen_fecha" ON "cuenta_corriente_pago" ("tenant_id", "almacen_id", "fecha")`,
    );

    await q(`
      CREATE TABLE "cuenta_corriente_pago_aplicacion" (
        "id"                        SERIAL PRIMARY KEY,
        "tenant_id"                 INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "pago_id"                   INTEGER       NOT NULL REFERENCES "cuenta_corriente_pago"("id") ON DELETE CASCADE,
        "cuenta_corriente_venta_id" INTEGER       NOT NULL REFERENCES "cuenta_corriente_venta"("id") ON DELETE CASCADE,
        "monto_aplicado"            DECIMAL(12,2) NOT NULL,
        "fecha"                     TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_cc_aplicacion_tenant_pago" ON "cuenta_corriente_pago_aplicacion" ("tenant_id", "pago_id")`,
    );
    await q(
      `CREATE INDEX "ix_cc_aplicacion_tenant_cc_venta" ON "cuenta_corriente_pago_aplicacion" ("tenant_id", "cuenta_corriente_venta_id")`,
    );

    await q(`
      CREATE TABLE "cuenta_corriente_movimiento" (
        "id"                  SERIAL PRIMARY KEY,
        "tenant_id"           INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "cuenta_corriente_id" INTEGER       NOT NULL REFERENCES "cuenta_corriente"("id") ON DELETE CASCADE,
        "tipo"                "cuenta_corriente_movimiento_tipo_enum" NOT NULL,
        "venta_id"            INTEGER       REFERENCES "venta"("id") ON DELETE SET NULL,
        "pago_id"             INTEGER       REFERENCES "cuenta_corriente_pago"("id") ON DELETE SET NULL,
        "monto"               DECIMAL(12,2) NOT NULL,
        "saldo_resultante"    DECIMAL(12,2) NOT NULL,
        "descripcion"         VARCHAR(500)  NOT NULL,
        "usuario_id"          INTEGER       REFERENCES "usuarios"("id") ON DELETE SET NULL,
        "fecha"               TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_cc_mov_tenant_cuenta_fecha" ON "cuenta_corriente_movimiento" ("tenant_id", "cuenta_corriente_id", "fecha")`,
    );

    // movimiento_caja va acá y no arriba con el resto de caja porque referencia
    // los pagos de cuenta corriente.
    await q(`
      CREATE TABLE "movimiento_caja" (
        "id"                       SERIAL PRIMARY KEY,
        "tenant_id"                INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "caja_id"                  INTEGER       NOT NULL REFERENCES "sesion_caja"("id") ON DELETE CASCADE,
        "tipo"                     "movimiento_caja_tipo_enum" NOT NULL,
        "monto"                    DECIMAL(12,2) NOT NULL,
        "medio_pago"               "movimiento_caja_medio_pago_enum" NOT NULL DEFAULT 'EFECTIVO',
        "detalle_pago"             VARCHAR(120),
        "origen"                   "movimiento_caja_origen_enum" NOT NULL DEFAULT 'MANUAL',
        "cuenta_corriente_pago_id" INTEGER       REFERENCES "cuenta_corriente_pago"("id") ON DELETE SET NULL,
        "motivo"                   VARCHAR(500)  NOT NULL,
        "observacion"              VARCHAR(500),
        "usuario_id"               INTEGER       NOT NULL REFERENCES "usuarios"("id"),
        "fecha"                    TIMESTAMP     NOT NULL DEFAULT now(),
        "anulado"                  BOOLEAN       NOT NULL DEFAULT false,
        "motivo_anulacion"         VARCHAR(500),
        "anulado_por_id"           INTEGER       REFERENCES "usuarios"("id"),
        "fecha_anulacion"          TIMESTAMP
      )
    `);
    await q(
      `CREATE INDEX "ix_mov_caja_tenant_caja" ON "movimiento_caja" ("tenant_id", "caja_id")`,
    );
    await q(
      `CREATE INDEX "ix_mov_caja_tenant_fecha" ON "movimiento_caja" ("tenant_id", "fecha")`,
    );

    await q(`
      CREATE TABLE "extraccion_ingreso" (
        "id"        SERIAL PRIMARY KEY,
        "tenant_id" INTEGER       NOT NULL REFERENCES "tenant"("id") ON DELETE RESTRICT,
        "origen"    "extraccion_ingreso_origen_enum" NOT NULL,
        "monto"     DECIMAL(12,2) NOT NULL,
        "motivo"    VARCHAR(500)  NOT NULL,
        "fecha"     TIMESTAMP     NOT NULL DEFAULT now()
      )
    `);
    await q(
      `CREATE INDEX "ix_extraccion_tenant_fecha" ON "extraccion_ingreso" ("tenant_id", "fecha")`,
    );

    // ================================================================
    // aislamiento
    // ================================================================
    // Acá se ponen el DEFAULT de tenant_id, el FORCE y la política. Es lo que
    // hace que el código portado no tenga que tocar un solo INSERT.
    await habilitarRls(queryRunner, TABLAS_DE_ESTA_MIGRACION);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    for (const tabla of TABLAS_DE_ESTA_MIGRACION) {
      for (const sql of sqlDeshabilitarRls(tabla)) {
        await q(sql);
      }
    }

    // El ciclo se rompe primero; si no, ninguna de las dos tablas se deja borrar.
    await q(
      `ALTER TABLE "orden_compra" DROP CONSTRAINT IF EXISTS "fk_orden_compra_gasto"`,
    );

    for (const tabla of [...TABLAS_DE_ESTA_MIGRACION].reverse()) {
      await q(`DROP TABLE IF EXISTS "${tabla}" CASCADE`);
    }

    for (const tipo of [
      'cuenta_corriente_movimiento_tipo_enum',
      'cuenta_corriente_pago_medio_pago_enum',
      'cuenta_corriente_venta_estado_enum',
      'extraccion_ingreso_origen_enum',
      'movimiento_caja_origen_enum',
      'movimiento_caja_medio_pago_enum',
      'movimiento_caja_tipo_enum',
      'sesion_caja_estado_enum',
      'ingreso_venta_tipo_enum',
      'venta_ajuste_origen_enum',
      'venta_ajuste_modo_enum',
      'venta_ajuste_tipo_enum',
      'gasto_origen_enum',
      'orden_compra_estado_enum',
    ]) {
      await q(`DROP TYPE IF EXISTS "${tipo}"`);
    }
  }
}
