/**
 * Los roles son GLOBALES, no por tenant: el código los compara por nombre, así
 * que un "Admin" significa lo mismo en todos los clientes. Por eso la tabla
 * `roles` no lleva tenant_id ni RLS.
 *
 * Lo que sí es por tenant es la ASIGNACIÓN (`usuario_rol`), porque cuelga de
 * `usuarios`.
 */
export const APP_ROLES = {
  ADMIN: 'Admin',
  VENDEDOR: 'Vendedor',
  COCINA: 'Cocina',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const APP_ROLE_NAMES = Object.values(APP_ROLES) as AppRole[];

export function isAppRole(name: string): name is AppRole {
  return (APP_ROLE_NAMES as readonly string[]).includes(name);
}

/**
 * El `LEGACY_ROLE_NAME_MAP` del proyecto viejo NO se porta: existía para
 * normalizar nombres heredados (`operador_caja`, `supervisor`, `administrador`)
 * de datos que ya estaban en la base. Este proyecto arranca sin datos, así que
 * no hay nada que normalizar. Si aparece un rol con otro nombre, es un bug de
 * carga, no un alias a traducir.
 */
