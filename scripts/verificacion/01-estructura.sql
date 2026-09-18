\pset pager off
\set ON_ERROR_STOP on

\echo ''
\echo '=== 1. CONTEO GENERAL ==='
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r')                       AS tablas,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND column_name='tenant_id')          AS con_tenant_id,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public')         AS politicas,
  (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
     WHERE n.nspname='public' AND t.typtype='e')                       AS enums,
  (SELECT count(*) FROM pg_indexes WHERE schemaname='public')          AS indices;

\echo ''
\echo '=== 2. tenant_id SIN ENABLE+FORCE RLS  (debe dar 0 filas) ==='
SELECT c.relname, c.relrowsecurity AS enable_rls, c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND EXISTS (SELECT 1 FROM information_schema.columns col
              WHERE col.table_schema='public' AND col.table_name=c.relname
                AND col.column_name='tenant_id')
  AND (c.relrowsecurity IS NOT TRUE OR c.relforcerowsecurity IS NOT TRUE)
ORDER BY 1;

\echo ''
\echo '=== 3. tenant_id SIN DEFAULT o NULLABLE  (debe dar 0 filas) ==='
SELECT table_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND column_name='tenant_id'
  AND (is_nullable <> 'NO'
       OR column_default IS DISTINCT FROM '(current_setting(''app.tenant_id''::text))::integer')
ORDER BY 1;

\echo ''
\echo '=== 4. POLITICAS SIN USING o SIN WITH CHECK  (debe dar 0 filas) ==='
SELECT tablename, policyname, qual IS NULL AS sin_using, with_check IS NULL AS sin_with_check
FROM pg_policies
WHERE schemaname='public' AND (qual IS NULL OR with_check IS NULL)
ORDER BY 1;

\echo ''
\echo '=== 5. TABLAS CON tenant_id Y SIN POLITICA  (debe dar 0 filas) ==='
SELECT col.table_name
FROM information_schema.columns col
WHERE col.table_schema='public' AND col.column_name='tenant_id'
  AND NOT EXISTS (SELECT 1 FROM pg_policies p
                  WHERE p.schemaname='public' AND p.tablename=col.table_name
                    AND p.policyname='tenant_isolation')
ORDER BY 1;

\echo ''
\echo '=== 6. usuarios: la politica debe tener el escape app.auth_lookup ==='
SELECT tablename, qual LIKE '%auth_lookup%' AS tiene_escape
FROM pg_policies WHERE schemaname='public' AND tablename='usuarios';

\echo ''
\echo '=== 7. CICLO orden_compra <-> gasto: ambas FKs deben existir ==='
SELECT conname, conrelid::regclass AS en_tabla, confrelid::regclass AS apunta_a
FROM pg_constraint
WHERE contype='f' AND (conrelid::regclass::text IN ('orden_compra','gasto'))
  AND confrelid::regclass::text IN ('orden_compra','gasto')
ORDER BY 1;

\echo ''
\echo '=== 8. FKs A tenant SIN ON DELETE RESTRICT  (debe dar 0 filas) ==='
SELECT conrelid::regclass AS tabla, conname, confdeltype
FROM pg_constraint
WHERE contype='f' AND confrelid='tenant'::regclass AND confdeltype <> 'r'
ORDER BY 1;
