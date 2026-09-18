-- Chequeo de deploy. Correr CONECTADO COMO LA APP, contra la base real.
--
-- `FORCE ROW LEVEL SECURITY` hace que RLS se aplique al DUEÑO de las tablas,
-- pero NO alcanza contra dos atributos de rol: un superusuario, o cualquier rol
-- con BYPASSRLS, se saltea las políticas por completo. Las políticas quedan
-- creadas y activas, `pg_class.relrowsecurity` dice true, y aun así la app ve
-- todos los tenants. No hay ningún error: parece que funciona.
--
-- Verificado en Postgres 17.11: conectado como superusuario, un SELECT sobre
-- `categoria` con `app.tenant_id` seteado devolvió las filas de los DOS tenants.
--
-- Si alguna de las dos columnas da `t`, el aislamiento NO existe en esa base.
SELECT
  current_user                       AS usuario_de_la_app,
  rolsuper                           AS es_superusuario,
  rolbypassrls                       AS saltea_rls,
  NOT (rolsuper OR rolbypassrls)     AS aislamiento_efectivo
FROM pg_roles
WHERE rolname = current_user;
