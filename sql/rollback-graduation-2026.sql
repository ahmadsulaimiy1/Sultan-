-- ROLLBACK — the 15 August 2026 graduation deployment.
--
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f sql/rollback-graduation-2026.sql
--
-- ONE FILE, TWO CALLERS, SO THE TESTED PROCEDURE AND THE EXECUTED PROCEDURE
-- ARE THE SAME TEXT. scripts/staging/readiness-gate.mjs check 11 runs this
-- inside a transaction it then reverts, against a staging clone; the deploy
-- workflow runs it for real if live acceptance fails. A rollback that was
-- rehearsed in one form and executed in another has not been rehearsed.
--
-- NO TRANSACTION CONTROL HERE. The caller owns it — psql -1 for the real run,
-- an explicit BEGIN/ROLLBACK for the rehearsal. That is deliberate: a COMMIT
-- inside this file would make the rehearsal destructive.
--
-- WHAT IT REMOVES, AND THE BOUND THAT MATTERS.
--
-- Exactly the thirty-three certificates this deployment created: ids 48–80,
-- engraved numbers 000048–000080. The bound is closed at BOTH ends and that
-- is not fussiness. `id > 47` would be correct today and wrong the first time
-- the Registrar issues 000081, silently deleting a certificate this
-- deployment never created. Ids 1–47 are the thirteen certificates already in
-- children's hands; nothing here may touch them under any circumstance,
-- including this deployment's own failure.

DELETE FROM student_identity_names;

DELETE FROM stage_certificates WHERE id BETWEEN 48 AND 80;

-- The serial counter follows the table down, never below what remains, so a
-- re-run of the deployment allocates the same numbers again rather than
-- skipping past them. GREATEST(…, 1) because setval rejects zero.
SELECT setval('stage_certificate_serial_seq', GREATEST(
  (SELECT COALESCE(MAX((regexp_match(serial_no, '-(\d{6})-'))[1]::int), 0) FROM stage_certificates),
  1), true);

SELECT setval(pg_get_serial_sequence('stage_certificates', 'id'), GREATEST(
  (SELECT COALESCE(MAX(id), 0) FROM stage_certificates), 1), true);

SELECT 'AFTER ROLLBACK  certificates on file' AS check, count(*)::text AS value FROM stage_certificates
UNION ALL SELECT 'AFTER ROLLBACK  highest engraved number',
  COALESCE(MAX((regexp_match(serial_no, '-(\d{6})-'))[1])::text, '(none)') FROM stage_certificates
UNION ALL SELECT 'AFTER ROLLBACK  serial sequence stands at', last_value::text FROM stage_certificate_serial_seq;

-- student_identity_names is emptied rather than filtered because this
-- deployment is the only thing that has ever written to it: the table is
-- created by sql/schema.sql in this same deployment and populated solely by
-- docs/graduation-registers/2026-08-15-IDENTITY-NAMES.sql. Filtering it by
-- the identities being removed would be worse, not safer — three of those
-- identities also hold certificates from 8 August, so a filtered delete would
-- leave a child with a historical name recorded and no record of the name it
-- was corrected from.
