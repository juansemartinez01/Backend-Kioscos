import type { QueryRunner } from 'typeorm';

export const TENANT_SETTING = 'app.tenant_id';

/** Ver `sqlHabilitarRlsUsuarios`. Solo lo prende AuthLookupService. */
export const AUTH_LOOKUP_SETTING = 'app.auth_lookup';

const POLICY = 'tenant_isolation';

/**
 * Genera el SQL que pone una tabla bajo aislamiento por tenant.
 *
 * Son cuatro cosas, y las cuatro hacen falta:
 *
 * 1. ENABLE ROW LEVEL SECURITY — prende el mecanismo.
 *
 * 2. FORCE ROW LEVEL SECURITY — NO ES OPCIONAL. Sin esto, RLS no se aplica al
 *    DUEÑO de la tabla. Si la app se conecta con el mismo usuario que corrió las
 *    migraciones (que es el caso por defecto), ese usuario es el dueño y ve
 *    TODAS las filas de TODOS los tenants, con las políticas creadas y
 *    aparentemente activas. Es el error más fácil de cometer acá y no da
 *    ninguna señal: parece que funciona hasta que un cliente ve datos de otro.
 *
 * 3. La política, con USING y WITH CHECK:
 *      - USING      → filtra SELECT, UPDATE y DELETE
 *      - WITH CHECK → valida INSERT y UPDATE (impide escribir en otro tenant)
 *    Solo con USING se podrían insertar filas ajenas.
 *
 * 4. DEFAULT en la columna — el motivo por el que el port no tiene que tocar un
 *    solo INSERT. Postgres completa `tenant_id` desde la variable de sesión.
 *    Sin esto habría que agregar `tenant_id` a mano en cada create() del código
 *    portado, que es justo lo que queremos evitar.
 */
export function sqlHabilitarRls(tabla: string): string[] {
  return [
    `ALTER TABLE "${tabla}" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('${TENANT_SETTING}')::int`,
    `ALTER TABLE "${tabla}" ALTER COLUMN "tenant_id" SET NOT NULL`,
    `ALTER TABLE "${tabla}" ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE "${tabla}" FORCE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "${POLICY}" ON "${tabla}"`,
    `CREATE POLICY "${POLICY}" ON "${tabla}"
       USING ("tenant_id" = current_setting('${TENANT_SETTING}')::int)
       WITH CHECK ("tenant_id" = current_setting('${TENANT_SETTING}')::int)`,
  ];
}

/**
 * `usuarios` es la única tabla que necesita una política distinta, y es por el
 * huevo y la gallina del login: en `POST /auth/login` todavía no hay token, así
 * que no hay `app.tenant_id`. Con la política normal, la búsqueda por email
 * devuelve cero filas y NADIE puede loguearse nunca.
 *
 * El escape es una segunda variable de sesión, `app.auth_lookup`, que solo
 * `AuthLookupService` prende, con SET LOCAL, dentro de una transacción propia y
 * para una única consulta (email -> usuario + tenant). Al cerrar la transacción
 * el valor se va con ella.
 *
 * Es explícito y auditable: buscar `app.auth_lookup` en el código muestra todos
 * los lugares que pueden leer usuarios de cualquier tenant. Hoy hay exactamente
 * uno, y debería seguir habiendo uno.
 */
export function sqlHabilitarRlsUsuarios(): string[] {
  const tabla = 'usuarios';
  return [
    `ALTER TABLE "${tabla}" ALTER COLUMN "tenant_id" SET DEFAULT current_setting('${TENANT_SETTING}')::int`,
    `ALTER TABLE "${tabla}" ALTER COLUMN "tenant_id" SET NOT NULL`,
    `ALTER TABLE "${tabla}" ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE "${tabla}" FORCE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "${POLICY}" ON "${tabla}"`,
    `CREATE POLICY "${POLICY}" ON "${tabla}"
       USING (
         current_setting('${AUTH_LOOKUP_SETTING}', true) = 'on'
         OR "tenant_id" = current_setting('${TENANT_SETTING}', true)::int
       )
       WITH CHECK ("tenant_id" = current_setting('${TENANT_SETTING}')::int)`,
  ];
}

export function sqlDeshabilitarRls(tabla: string): string[] {
  return [
    `DROP POLICY IF EXISTS "${POLICY}" ON "${tabla}"`,
    `ALTER TABLE "${tabla}" NO FORCE ROW LEVEL SECURITY`,
    `ALTER TABLE "${tabla}" DISABLE ROW LEVEL SECURITY`,
    `ALTER TABLE "${tabla}" ALTER COLUMN "tenant_id" DROP DEFAULT`,
  ];
}

export async function habilitarRls(
  queryRunner: QueryRunner,
  tablas: string[],
): Promise<void> {
  for (const tabla of tablas) {
    for (const sql of sqlHabilitarRls(tabla)) {
      await queryRunner.query(sql);
    }
  }
}

export async function deshabilitarRls(
  queryRunner: QueryRunner,
  tablas: string[],
): Promise<void> {
  for (const tabla of tablas) {
    for (const sql of sqlDeshabilitarRls(tabla)) {
      await queryRunner.query(sql);
    }
  }
}

/**
 * Las 32 tablas con dueño. `tenant` y `roles` quedan afuera a propósito:
 * `tenant` es el catálogo raíz y `roles` es global (el código compara roles por
 * nombre: Admin / Vendedor / Cocina).
 *
 * Se va llenando a medida que avanza el port (fase 2). Cada tabla que se suma
 * acá necesita además su índice compuesto — ver `TenantOwnedEntity`.
 */
export const TABLAS_CON_TENANT: string[] = [
  'usuario_rol',
  // TODO(fase-2): las 30 restantes, a medida que se portan las entidades.
  // Cada una entra acá Y en la migración que la crea, en el mismo commit.
];

/**
 * `usuarios` NO va en la lista de arriba: usa `sqlHabilitarRlsUsuarios()` por
 * el escape del login.
 */
export const TABLA_USUARIOS = 'usuarios';
