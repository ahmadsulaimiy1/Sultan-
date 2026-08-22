-- SHRS GRADUATION REGISTER — PREFLIGHT
--
-- Paste this into the Neon SQL Editor BEFORE the production import and read
-- the answer. It answers one question: is this database ready for
-- docs/graduation-registers/2026-08-08-PRODUCTION-IMPORT.sql, and has that
-- file already been run?
--
-- SAFE ON ANY DATABASE. It writes nothing permanent, changes no row, and
-- creates nothing that outlives the session — the one object it makes is a
-- TEMP table, which Postgres drops when the connection closes. It also
-- cannot fail on a database that is missing the tables it asks about, which
-- is the whole point of a preflight: every table reference below is built at
-- run time, after checking the catalogue, so a missing table is REPORTED
-- rather than raised. Run it as often as you like.
--
-- Read the `verdict` column. Any row saying STOP means do not run the
-- import yet.

DROP TABLE IF EXISTS _preflight;
CREATE TEMP TABLE _preflight (ord int, item text, value text, verdict text);

DO $$
DECLARE
  have_certs   bool := to_regclass('public.stage_certificates')          IS NOT NULL;
  have_students bool := to_regclass('public.students')                   IS NOT NULL;
  have_serial  bool := to_regclass('public.stage_certificate_serial_seq') IS NOT NULL;
  have_sid     bool := to_regclass('public.student_identity_seq')         IS NOT NULL;
  have_hkv     bool;
  have_ident   bool;
  n_certs      int;
  n_linked     int;
  seq_at       bigint;
BEGIN
  have_hkv := EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='public' AND table_name='stage_certificates'
                         AND column_name='hash_key_version');
  have_ident := EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='students'
                           AND column_name='identity_no');

  -- 1. Is the schema there at all? Everything else depends on this answer.
  INSERT INTO _preflight VALUES (1, 'schema — stage_certificates table',
    CASE WHEN have_certs THEN 'present' ELSE '(missing)' END,
    CASE WHEN have_certs THEN 'ready' ELSE 'STOP — run sql/schema.sql first' END);

  -- 2. The column the I'dadiyyah rows write explicitly. A schema predating
  --    key versioning lacks it, and the import fails on the first IDD row.
  INSERT INTO _preflight VALUES (2, 'schema — stage_certificates.hash_key_version',
    CASE WHEN have_hkv THEN 'present' ELSE '(missing)' END,
    CASE WHEN have_hkv THEN 'ready'
         ELSE 'STOP — schema is older than key versioning; re-run sql/schema.sql' END);

  -- 3. Where the permanent Student IDs are written.
  INSERT INTO _preflight VALUES (3, 'schema — students.identity_no',
    CASE WHEN have_ident THEN 'present' ELSE '(missing)' END,
    CASE WHEN have_ident THEN 'ready' ELSE 'STOP — run sql/schema.sql first' END);

  -- 4-5. The two counters the import advances.
  INSERT INTO _preflight VALUES (4, 'schema — stage_certificate_serial_seq',
    CASE WHEN have_serial THEN 'present' ELSE '(missing)' END,
    CASE WHEN have_serial THEN 'ready' ELSE 'STOP — run sql/schema.sql first' END);

  INSERT INTO _preflight VALUES (5, 'schema — student_identity_seq',
    CASE WHEN have_sid THEN 'present' ELSE '(missing)' END,
    CASE WHEN have_sid THEN 'ready' ELSE 'STOP — run sql/schema.sql first' END);

  -- 6. Has the import already run? Counted from the table, not assumed.
  --    0 = not yet. 13 = already done, and re-running is a no-op. Between
  --    the two is a partial state, which the import is built to complete.
  IF have_certs THEN
    EXECUTE $q$SELECT count(*) FROM stage_certificates
                WHERE serial_no LIKE 'SHRS-CERT-IBT-2026-0000%'
                   OR serial_no LIKE 'SHRS-CERT-IDD-2026-0000%'$q$ INTO n_certs;
    INSERT INTO _preflight VALUES (6, 'import — of the 13 issued certificates, on file',
      n_certs::text,
      CASE WHEN n_certs = 13 THEN 'already imported — the import is a no-op, safe to re-run'
           WHEN n_certs = 0  THEN 'not yet imported — run the import next'
           ELSE 'partly imported — run the import; it completes what is missing' END);
  ELSE
    INSERT INTO _preflight VALUES (6, 'import — of the 13 issued certificates, on file',
      '(no table)', 'STOP — run sql/schema.sql first');
  END IF;

  -- 7. Where the engraved-number counter stands. After the import it must
  --    read 47, so the next certificate issued is 000048 and never a number
  --    already printed on a document in a child's hands.
  IF have_serial THEN
    EXECUTE $q$SELECT last_value FROM stage_certificate_serial_seq$q$ INTO seq_at;
    INSERT INTO _preflight VALUES (7, 'import — serial sequence stands at',
      seq_at::text,
      CASE WHEN seq_at >= 47 THEN 'safe — the next number is past every printed certificate'
           ELSE 'below 47 — the import raises it; issue no certificate until it has run' END);
  ELSE
    INSERT INTO _preflight VALUES (7, 'import — serial sequence stands at',
      '(no sequence)', 'STOP — run sql/schema.sql first');
  END IF;

  -- 8. How many of the thirteen graduands have a student record for the
  --    import to attach their permanent ID to. Information, never a blocker:
  --    a certificate verifies from its own row whether or not the child has
  --    a student record yet.
  IF have_students THEN
    EXECUTE $q$SELECT count(*) FROM students WHERE full_name IN (
        'Hameedah Adebimpe Ojewumi','Aisha Anofi','Abdulbasit Adedokun',
        'Naheemah Ismail','Ashrof Akorede','Imran Adegoke',
        'Abdulateef Adedokun','Muhammad Ismail Seriki','Baqi Olamiposi Anofi',
        'Faridah Ayomide Aliu','Thoirah Makinde','Abdulbasit Amobi Jabarr',
        'Abdullah Oladimeji Anofi')$q$ INTO n_linked;
    INSERT INTO _preflight VALUES (8, 'linkage — graduands with a student record on file',
      n_linked || ' of 13',
      'informational — any not matched are listed by the import, and block nothing');
  ELSE
    INSERT INTO _preflight VALUES (8, 'linkage — graduands with a student record on file',
      '(no table)', 'STOP — run sql/schema.sql first');
  END IF;
END $$;

SELECT item AS "check", value, verdict FROM _preflight ORDER BY ord;
