\pset pager off
\set ON_ERROR_STOP on
SET client_min_messages TO NOTICE;

BEGIN;

INSERT INTO "tenant" ("slug","nombre") VALUES ('alfa2','Alfa'),('beta2','Beta');

DO $$
DECLARE
  t_alfa int; t_beta int; fallas int := 0; n int;
BEGIN
  SELECT id INTO t_alfa FROM tenant WHERE slug='alfa2';
  SELECT id INTO t_beta FROM tenant WHERE slug='beta2';

  PERFORM set_config('app.tenant_id', t_alfa::text, true);
  INSERT INTO usuarios (nombre,usuario,clave_hash,email)
    VALUES ('Ana','ana','x','ana@alfa.test');

  PERFORM set_config('app.tenant_id', t_beta::text, true);
  INSERT INTO usuarios (nombre,usuario,clave_hash,email)
    VALUES ('Bruno','admin','x','bruno@beta.test');

  -- 1. 'admin' repetido por tenant: alfa tambien puede tener el suyo
  PERFORM set_config('app.tenant_id', t_alfa::text, true);
  BEGIN
    INSERT INTO usuarios (nombre,usuario,clave_hash,email)
      VALUES ('Admin Alfa','admin','x','admin@alfa.test');
    RAISE NOTICE 'PASS L1  usuario "admin" permitido en dos tenants';
  EXCEPTION WHEN unique_violation THEN
    fallas:=fallas+1; RAISE WARNING 'FAIL L1  el usuario es unico global, no por tenant';
  END;

  -- 2. el email si es unico GLOBAL (es la clave del login)
  BEGIN
    INSERT INTO usuarios (nombre,usuario,clave_hash,email)
      VALUES ('Clon','clon','x','BRUNO@beta.test');
    fallas:=fallas+1; RAISE WARNING 'FAIL L2  acepto un email ya usado por otro tenant';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS L2  email unico global (y case-insensitive)';
  END;

  -- 3. sin el escape, alfa no ve al usuario de beta
  SELECT count(*) INTO n FROM usuarios WHERE email='bruno@beta.test';
  IF n = 0 THEN RAISE NOTICE 'PASS L3  sin auth_lookup el usuario ajeno es invisible';
  ELSE fallas:=fallas+1; RAISE WARNING 'FAIL L3  vi % usuario(s) de otro tenant', n; END IF;

  -- 4. con el escape prendido, el login puede resolver email -> tenant
  PERFORM set_config('app.auth_lookup', 'on', true);
  SELECT count(*) INTO n FROM usuarios WHERE email='bruno@beta.test';
  IF n = 1 THEN RAISE NOTICE 'PASS L4  con auth_lookup el login resuelve el email ajeno';
  ELSE fallas:=fallas+1; RAISE WARNING 'FAIL L4  el escape devolvio % filas, esperaba 1', n; END IF;

  -- 5. el escape es de LECTURA: no habilita escribir en el tenant ajeno
  BEGIN
    INSERT INTO usuarios (tenant_id,nombre,usuario,clave_hash,email)
      VALUES (t_beta,'Intruso','intruso','x','intruso@beta.test');
    fallas:=fallas+1; RAISE WARNING 'FAIL L5  el escape dejo ESCRIBIR en otro tenant';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS L5  el escape no habilita escritura cruzada';
  END;

  IF fallas > 0 THEN RAISE EXCEPTION 'LOGIN: % test(s) fallaron', fallas; END IF;
  RAISE NOTICE '--- bloque login: 5/5 OK ---';
END $$;

ROLLBACK;
