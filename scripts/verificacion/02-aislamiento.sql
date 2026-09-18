\pset pager off
\set ON_ERROR_STOP on
SET client_min_messages TO NOTICE;

BEGIN;

INSERT INTO "tenant" ("slug","nombre") VALUES ('alfa','Alfa'),('beta','Beta');

DO $$
DECLARE
  t_alfa int; t_beta int;
  fallas int := 0;
  n int;
BEGIN
  SELECT id INTO t_alfa FROM tenant WHERE slug='alfa';
  SELECT id INTO t_beta FROM tenant WHERE slug='beta';

  -- ---- 1. el DEFAULT completa tenant_id sin que el INSERT lo mencione ----
  PERFORM set_config('app.tenant_id', t_alfa::text, true);
  INSERT INTO categoria (nombre) VALUES ('Bebidas');
  SELECT tenant_id INTO n FROM categoria WHERE nombre='Bebidas';
  IF n = t_alfa THEN RAISE NOTICE 'PASS 1  DEFAULT completa tenant_id (=%)', n;
  ELSE fallas:=fallas+1; RAISE WARNING 'FAIL 1  tenant_id quedo % y esperaba %', n, t_alfa; END IF;

  -- ---- 2. mismo nombre en otro tenant: la unicidad es POR tenant ----
  PERFORM set_config('app.tenant_id', t_beta::text, true);
  BEGIN
    INSERT INTO categoria (nombre) VALUES ('Bebidas');
    RAISE NOTICE 'PASS 2  mismo nombre permitido en otro tenant';
  EXCEPTION WHEN unique_violation THEN
    fallas:=fallas+1; RAISE WARNING 'FAIL 2  la unicidad es global, no por tenant';
  END;

  -- ---- 3. SELECT solo ve lo propio ----
  SELECT count(*) INTO n FROM categoria;
  IF n = 1 THEN RAISE NOTICE 'PASS 3  beta ve 1 fila de 2 (aislamiento en SELECT)';
  ELSE fallas:=fallas+1; RAISE WARNING 'FAIL 3  beta ve % filas, esperaba 1', n; END IF;

  -- ---- 4. duplicado DENTRO del mismo tenant si debe fallar ----
  BEGIN
    INSERT INTO categoria (nombre) VALUES ('Bebidas');
    fallas:=fallas+1; RAISE WARNING 'FAIL 4  acepto duplicado dentro del mismo tenant';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS 4  duplicado dentro del tenant rechazado';
  END;

  -- ---- 5. WITH CHECK: no puedo insertar en el tenant ajeno ----
  BEGIN
    INSERT INTO categoria (tenant_id, nombre) VALUES (t_alfa, 'Intrusa');
    fallas:=fallas+1; RAISE WARNING 'FAIL 5  pude insertar en el tenant ajeno';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS 5  WITH CHECK bloqueo el INSERT cruzado';
  END;

  -- ---- 6. UPDATE cruzado no toca nada ----
  UPDATE categoria SET descripcion='hackeada' WHERE nombre='Bebidas' AND tenant_id=t_alfa;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE NOTICE 'PASS 6  UPDATE cruzado afecto 0 filas';
  ELSE fallas:=fallas+1; RAISE WARNING 'FAIL 6  UPDATE cruzado afecto % filas', n; END IF;

  -- ---- 7. DELETE cruzado no toca nada ----
  DELETE FROM categoria WHERE tenant_id=t_alfa;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE NOTICE 'PASS 7  DELETE cruzado afecto 0 filas';
  ELSE fallas:=fallas+1; RAISE WARNING 'FAIL 7  DELETE cruzado afecto % filas', n; END IF;

  -- ---- 8. sin app.tenant_id no se puede leer nada ----
  PERFORM set_config('app.tenant_id', '', true);
  BEGIN
    SELECT count(*) INTO n FROM categoria;
    fallas:=fallas+1; RAISE WARNING 'FAIL 8  lei % filas sin tenant seteado', n;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'PASS 8  sin app.tenant_id la consulta falla (%)', SQLERRM;
  END;

  IF fallas > 0 THEN
    RAISE EXCEPTION 'AISLAMIENTO: % test(s) fallaron', fallas;
  END IF;
  RAISE NOTICE '--- bloque negocio: 8/8 OK ---';
END $$;

ROLLBACK;
