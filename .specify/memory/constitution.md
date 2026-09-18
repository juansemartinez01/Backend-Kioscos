# Constitución — kioscos-multitenant-back

Derivada de la del proyecto viejo. Los principios I, II y IV se mantienen; el
III, el V y el VI cambian porque no sobreviven al multitenancy.

---

## I. Aislamiento por módulo de feature

Cada feature es un módulo NestJS con su controller, service, entidades y DTOs.
Sin cambios respecto del proyecto viejo.

## II. JWT global, `@Public()` como excepción

El `JwtAuthGuard` se aplica global en `main.ts`. Salirse es explícito, con
`@Public()`, y se justifica en el PR.

**Nunca desactivar el guard global.**

Agregado para este proyecto: una ruta `@Public()` corre **sin contexto de
tenant**, así que no puede leer ni escribir tablas con dueño. Si una ruta pública
necesita datos de un tenant, está mal marcada.

## III. El esquema se maneja SOLO por migraciones — `synchronize` en false

**Cambia respecto del proyecto viejo**, que exigía `synchronize: true` y prohibía
las migraciones y el SQL crudo para DDL.

Acá no es viable: las políticas de RLS, el `FORCE ROW LEVEL SECURITY` y el
`DEFAULT current_setting('app.tenant_id')` son DDL que TypeORM no modela. Con
`synchronize` prendido los pisaría en cada arranque y apagaría el aislamiento sin
emitir ningún error.

- `synchronize: false`, sin override por variable de entorno
- Toda entidad nueva con dueño llega con su migración, su política RLS y su
  índice compuesto **en el mismo commit**

> El principio viejo ya estaba vencido en los hechos: `cantina-rochester-back`
> tiene 11 migraciones y un `migration-runtime.ts` que las orquesta.

## IV. DTOs con class-validator

Todo body de entrada pasa por un DTO con decoradores.

**Reforzado**: el `ValidationPipe` es **global**, con `whitelist` y
`forbidNonWhitelisted`. En el proyecto viejo estaba importado en `main.ts` pero
nunca se aplicaba — solo 4 de 23 controllers lo usaban vía `@UsePipes`, así que
la mayoría de los endpoints aceptaba cualquier body.

`forbidNonWhitelisted` además rechaza campos de más, que es por donde entraría un
`tenant_id` puesto a mano.

## V. Tests de aislamiento obligatorios

**Cambia respecto del proyecto viejo**, que declaraba no tener tests.

No se pide cobertura general. Se pide lo que no se puede verificar leyendo
código: **que un tenant no vea al otro**.

- Toda tabla con dueño necesita un test que confirme que el tenant A no lee, no
  modifica y no borra filas del tenant B
- El comportamiento del proxy de repositorios está cubierto en
  `tenant-repository.provider.spec.ts`. Si alguien "optimiza" cacheando el
  repositorio, esos tests fallan — y tienen que fallar

> El principio viejo también estaba vencido: ya existe `caja.service.spec.ts`,
> con 352 líneas.

## VI. CORS por configuración

**Cambia respecto del proyecto viejo**, que lo tenía hardcodeado en `main.ts`.

Los orígenes salen de `CORS_ORIGINS`. Con un origen por cliente, sumar un tenant
no puede implicar tocar código y redeployar.

---

## VII. El aislamiento lo aplica la base, no el código (nuevo)

El código **no** es responsable de acordarse de filtrar por tenant. De eso se
encarga Postgres con RLS. Consecuencias:

- Toda entidad con dueño hereda de `TenantOwnedEntity`
- Toda tabla con dueño lleva `ENABLE` **y** `FORCE ROW LEVEL SECURITY`
- El contexto de tenant se establece **solo** desde el JWT verificado, nunca
  desde un header, un query param ni el body
- `app.auth_lookup` tiene exactamente un consumidor (`AuthLookupService`) y
  debería seguir teniendo uno

## VIII. Todo índice lleva `tenant_id` adelante (nuevo)

Un índice sobre `(almacen_id, fecha)` es inútil cuando cada query filtra primero
por tenant: Postgres termina escaneando filas de todos los clientes para
descartarlas, y el sistema se degrada con cada alta.

El proyecto viejo tenía 9 índices en 4 de sus 33 entidades, y Postgres no indexa
las FKs por su cuenta. Acá, toda entidad con dueño declara su índice compuesto
con `tenant_id` como primera columna.
