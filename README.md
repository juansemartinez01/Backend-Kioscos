# kioscos-multitenant-back

Backend multitenant para kioscos. Port de `cantina-rochester-back` con aislamiento
por tenant resuelto desde el JWT y aplicado por Postgres con Row-Level Security.

**El repo viejo sigue vivo y sin tocar**: Rochester y San Esquina corren ahí. Este
proyecto es para clientes nuevos.

---

## Cómo funciona el aislamiento

Cuatro piezas, todas en `src/tenancy/`:

| Archivo | Qué hace |
|---|---|
| `tenant-context.middleware.ts` | Verifica el JWT y abre el contexto con el `tenant_id`. Corre como **middleware**, antes que guards e interceptors, porque el contexto tiene que existir antes de que se use cualquier repositorio |
| `tenant-transaction.interceptor.ts` | Abre una transacción por request y le aplica `SET LOCAL app.tenant_id` |
| `tenant-repository.provider.ts` | Proxy que resuelve el `EntityManager` de esa transacción en cada llamada |
| `rls.ts` | Genera el SQL de las políticas para las migraciones |

El flujo de un request:

```
Bearer token
   -> middleware verifica y extrae tenant_id -> AsyncLocalStorage
   -> interceptor abre transacción + SET LOCAL app.tenant_id
   -> el repo (proxy) usa ESE manager
   -> Postgres filtra por política RLS
```

### Por qué el front no cambia

El código de negocio se sigue escribiendo igual que en el proyecto viejo:

```ts
constructor(@InjectRepository(Venta) private repo: Repository<Venta>) {}
```

El proxy hace que esa misma línea pase por la conexión con tenant aplicado. Los
~334 call sites del port no se tocan, y ningún path, DTO ni shape de respuesta
cambia de forma.

### Qué pasa si alguien se olvida el filtro

Nada: Postgres no devuelve las filas. El aislamiento no depende de que el código
se acuerde de filtrar, y por eso se eligió RLS en lugar de filtrado manual.

---

## Tres cosas que parecen detalles y no lo son

**1. `FORCE ROW LEVEL SECURITY` no es opcional.** Sin eso, RLS no se aplica al
dueño de la tabla. Como la app suele conectarse con el mismo usuario que corrió
las migraciones, ese usuario es el dueño y **ve todo, de todos los tenants**, con
las políticas creadas y aparentemente activas. No da ninguna señal de error.

**2. Tiene que ser `SET LOCAL`, no `SET`.** `SET` a secas se pega a la conexión,
y la conexión vuelve al pool: el próximo request la agarraría con el tenant del
anterior.

**3. `synchronize` va en `false`, siempre.** Las políticas, el `FORCE` y el
`DEFAULT current_setting(...)` son DDL que TypeORM no conoce y pisaría en cada
arranque, apagando el aislamiento en silencio. El esquema se maneja solo por
migraciones.

---

## El login y el huevo y la gallina

En `POST /auth/login` todavía no hay token, así que no hay `tenant_id`. Pero
`usuarios` está bajo RLS. Sin resolverlo, **nadie puede loguearse nunca**.

La salida es `AuthLookupService`: el único lugar autorizado a leer usuarios sin
contexto de tenant. Prende `app.auth_lookup` con `SET LOCAL`, dentro de su propia
transacción, para una sola consulta por email.

Por eso `usuarios.email` es **único global** — es el identificador de login y se
resuelve antes de conocer el tenant. `usuarios.usuario` es único **por tenant**,
así que cada cliente puede tener su propio `admin`.

> En el proyecto viejo `email` estaba declarado `unique: false` mientras el login
> autenticaba justamente por email. Ya era un bug con un solo cliente.

Si aparece un segundo lugar que necesite `app.auth_lookup`, casi seguro está mal
planteado: lo que necesita es contexto de tenant.

---

## Estado

Fases 0 y 1 hechas. Compila, los tests pasan.

- [x] Scaffold, config, `.gitignore`
- [x] Núcleo de tenancy (contexto, middleware, interceptor, proxy, RLS)
- [x] Auth con `tenant_id` en el JWT
- [x] `tenant`, `roles`, `usuarios`, `usuario_rol` + migración inicial
- [ ] Fase 2 — las 30 entidades restantes
- [ ] Fase 3 — índices compuestos y N+1
- [ ] Fase 4 — los 23 controllers y 25 services
- [ ] Fase 5 — `@Roles()` en los endpoints, contratos a corregir
- [ ] Fase 6 — tests de aislamiento sobre base real
- [ ] Fase 7 — alta de tenants y deploy

Plan completo en [`specs/002-multitenant-saas/plan.md`](specs/002-multitenant-saas/plan.md).

---

## Arranque

```bash
npm install
cp .env.example .env.local   # completar DB_* y JWT_SECRET
npm run migration:run
npm run start:dev
```

`JWT_SECRET` no tiene valor por defecto y el proceso no arranca sin ella. Es a
propósito: el proyecto viejo tenía `|| 'default_secret'`, y con eso olvidarse la
variable no rompía nada — el server firmaba tokens con un secreto público
conocido. Acá eso sería un `tenant_id` forjado.

---

## Alta de un cliente nuevo

```sql
INSERT INTO tenant (slug, nombre) VALUES ('mi-cliente', 'Mi Cliente');
```

Después, un usuario admin con ese `tenant_id`. No hace falta infraestructura
nueva: misma base, mismo contenedor. Eso es lo que este proyecto viene a
resolver.
