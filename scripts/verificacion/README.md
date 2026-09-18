# Verificación del aislamiento

Cuatro scripts de psql que comprueban, contra una base real, que el esquema
multitenant aísla de verdad. No son tests unitarios: son SQL, y hablan con el
motor, que es el único que puede confirmar que RLS funciona.

Se corren en orden. Los tres primeros son de lectura o hacen ROLLBACK, así que
son seguros contra cualquier base. `02` y `03` escriben dentro de una
transacción que siempre revierten.

| script | qué comprueba |
|---|---|
| `00-bypass-rls.sql` | el rol de la app no es superusuario ni tiene BYPASSRLS |
| `01-estructura.sql` | toda tabla con `tenant_id` tiene DEFAULT, NOT NULL, ENABLE+FORCE RLS y una política con USING **y** WITH CHECK |
| `02-aislamiento.sql` | 8 pruebas de aislamiento sobre `categoria` con dos tenants |
| `03-login.sql` | 5 pruebas del escape `app.auth_lookup` de `usuarios` |

## Correrlos

```bash
psql "$DATABASE_URL" -f scripts/verificacion/00-bypass-rls.sql
psql "$DATABASE_URL" -f scripts/verificacion/01-estructura.sql
psql "$DATABASE_URL" -f scripts/verificacion/02-aislamiento.sql
psql "$DATABASE_URL" -f scripts/verificacion/03-login.sql
```

`02` y `03` terminan con `RAISE EXCEPTION` si algo falla, así que el exit code
sirve en CI. `01` imprime filas: **toda consulta marcada "debe dar 0 filas" que
devuelva algo es una falla.**

## Contra una base descartable

```bash
docker run -d --name kioscos-verify -p 55432:5432 \
  -e POSTGRES_USER=kioscos -e POSTGRES_PASSWORD=<elegir> \
  -e POSTGRES_DB=kioscos_verify postgres:17-alpine
```

Importante: el usuario que crea el contenedor es superusuario y **se saltea
RLS**, así que con ese rol los tests de aislamiento dan falsos negativos. Hay
que crear un rol sin privilegios, darle la base, y correr las migraciones *con
ese rol* para que sea el dueño de las tablas:

```sql
CREATE ROLE kioscos_app LOGIN PASSWORD '<elegir>' NOSUPERUSER NOBYPASSRLS;
ALTER DATABASE kioscos_verify OWNER TO kioscos_app;
ALTER SCHEMA public OWNER TO kioscos_app;
```

```bash
DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=kioscos_verify \
DB_USER=kioscos_app DB_PASS=<elegir> DB_SSL=false npm run migration:run
```

## Resultado de la fase 2

Corrido contra PostgreSQL 17.11 el 2026-09-18, sobre el esquema de las
migraciones `InitTenancy` + `NegocioFaseDos`:

- 35 tablas, 32 con `tenant_id`, 32 políticas, 14 enums, 90 índices
- `01`: sin hallazgos
- `02`: 8/8 — `03`: 5/5
- round trip `up → down → up` limpio: el `down()` deja 1 tabla (`migrations`) y
  la segunda aplicación da un esquema idéntico al de la primera
