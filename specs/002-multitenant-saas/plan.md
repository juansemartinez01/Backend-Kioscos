# Plan: Proyecto espejo multitenant (repo nuevo)

**Fecha**: 2026-09-18
**Estado**: aprobado — fases 0, 1 y 2 implementadas y verificadas contra Postgres 17.11
**Origen**: port de `cantina-rochester-back` (15.930 líneas, 33 entidades, 23 controllers, 25 services, 69 DTOs)
**Destino**: `kioscos-multitenant-back` → `github.com/juansemartinez01/Backend-Kioscos`

> Este documento se escribió en el repo viejo y se movió acá. Las secciones marcadas
> **Corrección** rectifican decisiones de la primera versión que no sobrevivieron a la
> implementación.

---

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Aislamiento de datos | `tenant_id` + Row-Level Security de Postgres |
| Contratos inseguros | Se arreglan; se entrega lista de cambios al front |
| Alcance de módulos | Portar los 23 controllers; limpieza posterior con datos de uso |

**Restricción transversal**: no cambiar contratos del front salvo que sea estrictamente necesario.

**Lo que NO se toca**: el repo actual y su deploy. Rochester y San Esquina siguen corriendo
`cantina-rochester-back` sin modificación. Este proyecto es para clientes nuevos.

---

## El problema del huevo y la gallina en el login

El pedido es "que a partir del token sepa qué tenant es". Eso funciona para las 137 rutas
autenticadas, pero **en `POST /auth/login` todavía no hay token**. Hay que resolver de dónde
sale el tenant en ese único momento.

| Opción | Cambia el front | Nota |
|---|---|---|
| **`usuarios.email` único global** | **No** | El login busca por email, lee su `tenant_id`, lo estampa en el JWT. Un usuario pertenece a un tenant. |
| Selector de tenant en el login | Sí | Campo nuevo en la pantalla de login |
| Subdominio (`cliente.app.com`) | Sí | Requiere DNS y config por cliente |
| Header `x-tenant-id` | Sí | Además es inseguro: el cliente elige su propio tenant |

**Elegido: email único global.** Es la única opción que respeta "no cambiar contratos".
El front manda `{email, password}` exactamente igual que hoy y recibe el mismo
`{access_token, user}`. El `tenant_id` viaja dentro del JWT, invisible para el front.

> **Corrección sobre la primera versión de este plan**, que decía `usuario` único global.
> `local.strategy.ts` del proyecto viejo tiene
> `super({ usernameField: 'email', passwordField: 'password' })`: **el login autentica por
> email, no por `usuario`**. Y en `usuario.entity.ts` el email está declarado
> `@Column({ length: 255, unique: false })` mientras `usuario` sí es `unique: true`.
> O sea: el proyecto viejo ya autentica por una columna no única, con un solo cliente.

Entonces el identificador de login (`email`) es único **global**, y `usuario` pasa a ser
único **por tenant** — cada cliente puede tener su propio `admin`, que es lo que se quería.

### El login contra RLS

`usuarios` va a estar bajo RLS. En el login todavía no hay `app.tenant_id`, así que
`findByEmail` devuelve **cero filas** y no se puede loguear nadie, nunca.

La salida es una segunda variable de sesión, `app.auth_lookup`, que la política de
`usuarios` acepta como alternativa al match por tenant. La prende `AuthLookupService` con
`SET LOCAL`, en su propia transacción, para una sola consulta por email — y es el único
lugar del sistema autorizado a hacerlo.

Si aparece un segundo consumidor de `app.auth_lookup`, casi seguro está mal planteado:
lo que necesita es contexto de tenant.

---

## Arquitectura

### 1. El tenant entra por el JWT

Dos archivos, ~20 líneas. Es la parte que pediste y es la más chica del trabajo.

- `auth.service.ts` — agregar `tenant_id` al payload que se firma
- `jwt.strategy.ts` — devolver `tenant_id` en el objeto que queda en `req.user`

> Nota aparte: hoy `jwt.strategy.ts` tiene `secretOrKey: configService.get('JWT_SECRET') || 'default_secret'`.
> Ese fallback no va al repo nuevo — si falta la env var, el proceso tiene que no arrancar.

### 2. El tenant se propaga sin tocar los 334 `@InjectRepository`

El truco que evita reescribir todo el código: sobreescribir el provider del token del
repositorio por uno que devuelve un **Proxy singleton**, que resuelve el `EntityManager` de
la transacción del request (el que tiene el `SET LOCAL app.tenant_id` aplicado) **en cada
acceso a propiedad**, no al construirse.

```ts
{
  provide: getRepositoryToken(Venta),
  inject: [TenantContextService, getDataSourceToken()],
  useFactory: (ctx, ds) => crearProxyDeRepositorio(Venta, ctx, ds),
}
```

Los 334 call sites de `@InjectRepository(X) private repo: Repository<X>` siguen funcionando
sin una sola modificación.

> **Corrección sobre la primera versión de este plan**, que proponía `Scope.REQUEST`.
> No funciona, por dos razones:
>
> 1. **El scope se contagia hacia arriba.** Un provider request-scoped vuelve
>    request-scoped al servicio que lo inyecta, y al controller que inyecta ese servicio.
>    Con 25 servicios y 23 controllers, se reinstancia el grafo entero en cada request.
> 2. **El orden no da.** Los providers request-scoped se resuelven antes de que corran los
>    interceptors — o sea antes de que exista la transacción que el factory necesita leer.
>
> El Proxy no tiene ninguno de los dos problemas: es singleton (no contagia) y resuelve al
> usarse, que es siempre después del interceptor.

Si no hay contexto (ruta `@Public()`, o un job fuera de request) cae al manager global, que
no tiene `app.tenant_id` — así que RLS no le devuelve filas de las tablas con tenant. Falla
cerrado, no abierto. Está cubierto en `tenant-repository.provider.spec.ts`.

### 3. Postgres hace cumplir el aislamiento

Por cada tabla con tenant:

```sql
ALTER TABLE venta ALTER COLUMN tenant_id SET DEFAULT current_setting('app.tenant_id')::int;
ALTER TABLE venta ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON venta
  USING      (tenant_id = current_setting('app.tenant_id')::int)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::int);
```

El interceptor abre la transacción del request y hace `SET LOCAL app.tenant_id = $1`
con el valor del JWT. Si a una query se le olvida el filtro, **la base igual no
devuelve filas de otro tenant**. Esa es la razón de elegir RLS sobre filtrado manual.

Tres detalles de esas seis líneas que no son cosméticos:

- **`FORCE` no es opcional.** Sin él, RLS **no se aplica al dueño de la tabla**. Como la app
  se conecta con el mismo usuario que corrió las migraciones, ese usuario es el dueño y ve
  todo, de todos los tenants, con las políticas creadas y aparentemente activas. No hay
  error, no hay warning: simplemente no aísla.
- **`WITH CHECK` además del `USING`.** `USING` filtra lo que se lee; `WITH CHECK` valida lo
  que se escribe. Sin él, un `UPDATE` podría mover una fila al tenant de otro.
- **El `DEFAULT` es lo que evita tocar un solo `INSERT`.** La columna se completa sola desde
  la variable de sesión, así que los `save()` y `create()` del port quedan igual que en el
  proyecto viejo.

Tiene que ser **`SET LOCAL`**, no `SET`: `SET` a secas se queda pegado a la conexión, y la
conexión vuelve al pool. El próximo request la tomaría con el tenant del anterior.

Costo a tener en cuenta: una transacción por request ocupa una conexión mientras dura el
request. En `db.t4g.micro` el pool es chico, así que `DB_POOL_MAX` es un parámetro a mirar
cuando entren clientes.

### 4. Qué tablas llevan `tenant_id`

Al ser proyecto nuevo **no hay backfill**: se estampa `tenant_id NOT NULL` en la tabla
desde el principio. Esto ahorra los 4-6 días de remapeo de FKs que costaba migrar.

- **Tabla nueva**: `tenant`
- **Global (sin `tenant_id`)**: `roles` — el código compara roles por nombre
  (`Admin`/`Vendedor`/`Cocina`), conviene que sigan siendo globales
- **Con `tenant_id`**: las 32 restantes

### 5. Los 9 UNIQUE que hay que reescribir

Con una sola base compartida, todo UNIQUE global rompe al segundo cliente.
Pasan a ser compuestos con `tenant_id`:

`producto.sku` · `producto.barcode` · `categoria.nombre` · `gasto_categoria.nombre`
· `promocion.codigo` · `parametros_reorden(producto_id)` · `promocion_producto(promocion, producto)`

A esos se suma `usuarios.usuario`, que pasa a `(tenant_id, usuario)`.

Quedan globales a propósito: `roles.nombre` y **`usuarios.email`** — el identificador de
login, que se resuelve antes de conocer el tenant (ver sección del login).

En `usuarios` el índice es sobre `lower(email)`, no sobre `email`: `local.strategy.ts` no
normaliza el input, así que sin eso `Juan@x.com` y `juan@x.com` serían dos cuentas.

---

## Performance: la mitad del trabajo

Hoy hay **9 índices en 4 de las 33 entidades**. Postgres no indexa las FKs solo, así que
`almacen_id`, `producto_id` y `venta_id` hacen seq scan. **Agregar `tenant_id` sin índices
compuestos degrada el sistema con cada cliente nuevo**: cada query escanea las filas de todos
los tenants para descartarlas.

Por eso "optimizar consultas" y "hacer multitenant" no son dos tareas, son la misma.

| Ítem | Estado | Acción |
|---|---|---|
| Índices | 9 en 4 entidades | Compuestos `(tenant_id, <cols de filtro>)` en las 32 tablas |
| N+1 (`await` dentro de `for...of`) | 7 servicios | `factura`, `promocion`, `stock-actual`, `venta`, `orden-compra`, `producto`, `usuario` |
| `eager: true` | 6 relaciones | Pasar a carga explícita; hoy fuerzan join en toda consulta |
| `relations: [...]` | 27 usos | Revisar los que traen árboles completos sin necesidad |

### Dos upserts en SQL crudo que rompen en silencio

`venta.service.ts:1077` y `stock-actual.service.ts:530`:

```sql
INSERT INTO stock_actual (producto_id, almacen_id, cantidad, cantidad_gramos)
VALUES ($1,$2,0,NULL) ON CONFLICT (producto_id, almacen_id) DO NOTHING
```

Si `tenant_id` entra en esa clave, el `ON CONFLICT` deja de matchear y **no falla**:
inserta duplicados. Hay que actualizar ambos a mano — ningún compilador los va a marcar.

---

## Contratos a romper (decisión: arreglarlos)

Estos son los cambios que el front va a tener que acompañar. Son pocos.

| Endpoint | Hoy | Por qué no puede quedar así |
|---|---|---|
| `POST /usuarios` | `@Public()` | Cualquiera sin autenticar crea usuarios. En multitenant, en cualquier tenant |
| `POST /ventas` | Toma `usuarioId` del body | Se puede facturar a nombre de otro. La identidad tiene que salir del JWT |
| `role-sync.controller` | Todo `@Public()`, header secreto | Revisar si sigue vivo (ver limpieza posterior) |

**El resto de los 137 endpoints no cambia de forma.** El tenant sale del token,
así que ni los paths, ni los DTOs, ni los shapes de respuesta se tocan.

### Deuda que además se arregla de paso

- `ValidationPipe` está importado en `main.ts` pero **nunca se aplica global**
  (solo 4 controllers usan `@UsePipes`). Contradice el principio IV de la constitución
- `@Roles()` existe y está exportado pero **se usa 0 veces**: los 137 endpoints son
  efectivamente "cualquier usuario autenticado". El `RolesGuard` es código muerto
- CORS es un array hardcodeado de 5 orígenes en `main.ts`; con clientes nuevos
  tiene que salir de configuración

---

## Constitución: tres principios a reescribir

El repo nuevo necesita su propia constitución. Estos tres no sobreviven:

| Principio | Dice | Realidad / Necesidad |
|---|---|---|
| III — `synchronize: true`, sin migraciones, "NUNCA SQL crudo para DDL" | — | RLS **es** DDL. Y el repo viejo ya tiene `src/migrations/1783441000000-AddCuentaCorriente.ts` |
| V — Sin tests | — | Ya existe `caja.service.spec.ts` (352 líneas). Con RLS hacen falta tests de aislamiento: son la única forma de probar que un tenant no ve al otro |
| VI — CORS fijo en `main.ts` | — | Pasa a configuración por entorno |

---

## Fases

| # | Fase | Días | Contenido |
|---|---|---|---|
| 0 | ~~Bootstrap del repo~~ **hecha** | 1 | Repo limpio, `.gitignore` correcto, scaffold Nest, constitución nueva |
| 1 | ~~Núcleo de tenancy~~ **hecha** | 3-4 | Entidad `tenant`, JWT, contexto de request, interceptor, override de repos, RLS base |
| 2 | ~~Port de entidades~~ **hecha y probada** | 4-5 | 30 entidades de negocio con `tenant_id`, los UNIQUE compuestos, 48 índices, 14 enums, políticas RLS, migración con `down()` |
| 3 | Índices y performance | 4-5 | Índices compuestos, 7 N+1, `eager`, los 2 upserts crudos |
| 4 | Port de módulos | 8-10 | Los 23 controllers y 25 services |
| 5 | Seguridad y contratos | 3-4 | `ValidationPipe` global, `@Roles()` activo, los 3 endpoints, CORS por config |
| 6 | Tests de aislamiento | 3-4 | Que un tenant no vea al otro, en cada tabla. Base: `scripts/verificacion/` |
| 7 | Alta de tenants y deploy | 2-3 | Onboarding de cliente nuevo, docker-compose, EC2, **rol de app sin superusuario ni BYPASSRLS** |
| | **Total** | **28-36 días persona** | ~6-8 semanas |

Coincide con la estimación previa para escenario espejo (29-38 días), ahora con las fases
ancladas a hallazgos medidos.

---

### Corrección: lo que cambió al implementar la fase 2

Tres cosas de este documento no sobrevivieron al código:

**No son 32 entidades de negocio, son 30.** El plan contaba `tenant`, `usuarios`,
`roles` y `usuario_rol`, que son de la fase 1. El total del esquema es 34 tablas:
4 de tenancy + 30 de negocio.

**`TenantOwnedEntity` ya no declara `@Index()` sobre `tenant_id`.** El plan lo daba
por bueno. En la práctica quedaba duplicado en 29 de las 32 tablas, porque todas
tienen un índice compuesto que arranca con `tenant_id` y Postgres lo usa igual para
un predicado sobre la primera columna. Eran 29 índices que costaban escrituras sin
acelerar ninguna lectura, con nombres autogenerados ilegibles (`IDX_89dcc27a…`).
Las únicas tres tablas sin compuesto —`unidad`, `almacen`, `proveedor`— llevan
ahora uno propio y nombrado.

**Una migración no importa `TABLAS_CON_TENANT`.** La fase 1 lo hacía. La constante
crece con cada entidad nueva, pero una migración es una foto de un momento: la de
fase 1, corrida sobre una base nueva, intentaría prender RLS sobre 30 tablas que en
ese punto de la historia no existen. Cada migración escribe adentro las tablas que
ella misma crea. El consumidor legítimo de la constante es el test de aislamiento
de la fase 6.

### La fase 2, corrida contra un Postgres real

Ya no está pendiente. El 2026-09-18 el esquema se aplicó contra PostgreSQL 17.11
en una base descartable, y ahí aparecieron cosas que la verificación contra los
metadatos de TypeORM no podía ver. Los scripts quedaron en
`scripts/verificacion/`, con su README.

**Estructura**: 35 tablas (30 de negocio + 4 de tenancy + `migrations`), 32 con
`tenant_id`, 32 políticas, 14 enums, 90 índices. Ninguna tabla con `tenant_id`
sin DEFAULT, sin NOT NULL, sin ENABLE+FORCE, o con una política a la que le
falte USING o WITH CHECK. El ciclo `orden_compra` ↔ `gasto` quedó cerrado con
las dos FKs. Ninguna FK a `tenant` sin `ON DELETE RESTRICT`.

**Aislamiento**: 8/8. El DEFAULT completa `tenant_id` sin que el INSERT lo
mencione — que es lo que permite portar los servicios sin tocar un solo
`create()`. El SELECT de un tenant ve 1 de 2 filas. El WITH CHECK rechaza el
INSERT cruzado. El UPDATE y el DELETE cruzados afectan 0 filas. Sin
`app.tenant_id` seteado no se puede leer nada, ni siquiera por accidente.

**Login**: 5/5. Dos tenants pueden tener cada uno su usuario `admin`; el email
sigue siendo único global y case-insensitive. Sin `app.auth_lookup` el usuario
de otro tenant es invisible; con el escape prendido el login lo resuelve. Y el
escape es de lectura: con él prendido, el INSERT cruzado igual se rechaza.

**`down()`**: probado. El round trip `up → down → up` deja la base en 1 tabla
(`migrations`) y la segunda aplicación produce un esquema idéntico al de la
primera — las tres verificaciones vuelven a dar lo mismo.

**Hallazgo que cambia el deploy**: `FORCE ROW LEVEL SECURITY` protege contra el
dueño de las tablas, pero **no contra los atributos de rol**. Conectado como
superusuario, el mismo SELECT devolvió las filas de los dos tenants, con las
políticas creadas y `relrowsecurity` en true. Un rol con BYPASSRLS hace lo
mismo. No hay error ni señal de ningún tipo.

Esto convierte algo que parecía de infraestructura en un requisito del diseño:
**la app no puede conectarse con un superusuario ni con un rol con BYPASSRLS**,
y eso no es el default de un Postgres recién creado ni del usuario maestro de un
RDS. La fase 7 tiene que crear un rol dedicado, dueño del esquema, y el deploy
tiene que correr `scripts/verificacion/00-bypass-rls.sql` contra la base real
antes de dar por bueno el aislamiento.

---

## Bootstrap: pasos concretos

### 1. Crear el repo en GitHub (lo hacés vos)

No tengo GitHub CLI instalado en esta máquina, así que el repo lo creás vos.
**Privado**, a diferencia del viejo que es público — el actual obligó a gitignorear
`docs/confidencial/` para no filtrar credenciales.

### 2. Arrancar limpio, no forkear

El repo viejo tiene **7.719 de 8.014 archivos versionados bajo `outputs/`** — el 96%.
Borrarlos ahora no los saca del historial. El repo nuevo arranca con `git init`.

`.gitignore` del proyecto nuevo, con lo que le falta al viejo:

```
/node_modules
/dist
*.log
.env*
!.env.production
/outputs
/docs/confidencial/
.claude/settings.local.json
```

(`/outputs` es la línea que falta en el repo viejo.)

### 3. Rescatar las dos ramas sin pushear (en el repo viejo)

Esto es urgente e independiente del proyecto nuevo. El remoto viejo **solo tiene `main`**.
Estas ramas existen únicamente en el disco de esta máquina:

- `desarrollo` — 2 commits (`Carga rapida producto`)
- `feature/precios-por-almacen` — 4 commits (`Precios por almacen`)

Si se pierde la carpeta, se pierde ese trabajo. Hay que pushearlas al repo viejo,
o portar el contenido al nuevo si ya no aplican.
