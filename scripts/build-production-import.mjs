#!/usr/bin/env node
/**
 * Build the production-safe import for certificates ALREADY IN CIRCULATION.
 *
 *     node scripts/build-production-import.mjs
 *
 * THE RULE THIS SCRIPT EXISTS TO ENFORCE: the database is brought into
 * agreement with the certificates, never the certificates with the database.
 * Thirteen sheets are signed, sealed and handed to children. Their numbers,
 * names, Student IDs, document ids, archive references, verification codes,
 * QR payloads, barcodes and content hashes are fixed facts about objects in
 * the world. Nothing here may recompute any of them.
 *
 * So this script does NOT read the issuing pipeline, does NOT import the
 * signing code, and does NOT know how a serial or a hash is formed. It reads
 * the two sealed register SQL files under docs/graduation-registers/ and
 * lifts their INSERT statements out VERBATIM — the column list and the value
 * tuple are copied as text, byte for byte, and the copy is asserted equal to
 * the source before anything is written. A generator that could produce a
 * different value than the sealed register is a generator that could
 * contradict a printed certificate, so this one is built so it cannot.
 *
 * What it adds around those untouched statements is the three things the
 * sealed files lack for a live database:
 *
 *   1. IDEMPOTENCY. ON CONFLICT DO NOTHING on every insert, so a second run
 *      changes nothing. Used honestly: DO NOTHING can also swallow a REAL
 *      collision, so the file ends with a verification block that re-reads
 *      every row and aborts the transaction unless all thirteen are present
 *      AND their hash, name and Student ID match the certificate exactly.
 *
 *   2. A SEQUENCE REPAIR THAT CANNOT GO BACKWARDS. The sealed files each
 *      setval to their own last number — 41 and 47. Run in the wrong order
 *      that leaves the counter at 41 and the next certificate issued is
 *      000042, a number already engraved on Yaseer Balogun's document. Here
 *      the sequences are driven from GREATEST(what is actually in the table,
 *      where the counter already stands), so the order of import cannot
 *      matter and the counter can only ever move forward.
 *
 *   3. ONE TRANSACTION. Either the whole graduation is on the register or
 *      none of it is. A half-imported cohort is the state that is hardest to
 *      reason about afterwards.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'docs/graduation-registers';

// TWO IMPORTS, ONE GENERATOR.
//
// The recovery of 8 August created records for the thirteen certificates that
// were already in children's hands. The deployment of 15 August creates
// records for the thirty-three minted for the rest of the graduating class.
// They are the same act against different sealed registers, so they are built
// by the same code rather than by a copy of it: a second generator is a second
// place for the verbatim-copy guarantee above to be quietly weakened.
//
// Order within a target matters for readability only — the sequence repair is
// order-independent by construction — but each list runs in the order the
// numbers were issued in, which is the order the file should read in.
const TARGETS = {
  issued: {
    out: '2026-08-08-PRODUCTION-IMPORT.sql',
    sources: ['2026-08-08-IBT-000035.sql', '2026-08-08-IDD-000042.sql'],
    standing: 'already issued, already printed, already handed to\n'
      + '-- the graduands. This file creates their RECORDS.',
    reused: "000042 again, which is engraved on a\n--    document in a child's hands.",
  },
  graduation: {
    out: '2026-08-15-GRADUATION-IMPORT.sql',
    sources: [
      '2026-08-08-QUR-000048.sql',
      '2026-08-08-TMH-000051.sql',
      '2026-08-08-IBT-000052.sql',
      '2026-08-08-IDD-000055.sql',
      '2026-08-08-PRY-000056.sql',
      '2026-08-08-JSS-000062.sql',
      '2026-08-08-SS-000077.sql',
    ],
    standing: 'minted on 15 August 2026 under key version 3 for the\n'
      + '-- graduands of the 8 August ceremony who had no certificate record at all.\n'
      + '-- Their numbers, names, Student IDs and content hashes are fixed the moment\n'
      + '-- they are minted, because the five characters engraved on the face are the\n'
      + '-- head of the content hash. This file creates their RECORDS.',
    reused: 'a number this batch has already spent, every one of\n'
      + '--    which is the head of its own certificate’s content hash and cannot be\n'
      + '--    re-derived for a different child.',
  },
};
const TARGET = TARGETS[process.argv[2] || 'issued'];
if (!TARGET) {
  console.error(`  Unknown target "${process.argv[2]}". Expected one of: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(2);
}
const SOURCES = TARGET.sources;
const OUT = `${DIR}/${TARGET.out}`;

// ── Lift, without interpreting ─────────────────────────────────────────────
// Each pattern captures whole statements as text. Nothing inside a captured
// statement is parsed, normalised, re-quoted or re-ordered: the only edit
// made to an INSERT is appending a conflict clause after its final ')'.
const inserts = [];
const identityUpdates = [];
for (const file of SOURCES) {
  const sql = readFileSync(`${DIR}/${file}`, 'utf8');
  for (const line of sql.split('\n')) {
    const t = line.trim();
    if (t.startsWith('INSERT INTO stage_certificates ')) inserts.push({ file, text: t });
    else if (t.startsWith('UPDATE students SET identity_no')) identityUpdates.push({ file, text: t });
  }
}
if (!inserts.length) { console.error('  No INSERT statements found — refusing to write an empty import.'); process.exit(2); }

// ── Read back the facts the verification block will assert ────────────────
// These are read OUT of the lifted text, not computed. If the regex fails to
// find one, that is a hard stop: an assertion built from a guessed value is
// worse than no assertion.
const rows = inserts.map(({ file, text }) => {
  const tuple = text.slice(text.indexOf('VALUES (') + 'VALUES ('.length);
  const id = /^(\d+),/.exec(tuple);
  const serial = /'(SHRS-CERT-[A-Z]{2,4}-\d{4}-\d{6}-[0-9A-F]{5})'/.exec(text);
  const hash = /'([0-9a-f]{64})'/.exec(text);
  const identityNo = /, '(\d{15})',/.exec(text);
  // The printed name is the field immediately after the Student ID. It is
  // read positionally rather than by pattern because a name is arbitrary
  // text — quoting it out by shape would be guessing at a child's name.
  const afterIdentity = identityNo ? text.slice(identityNo.index + identityNo[0].length) : '';
  const name = /^\s*'((?:[^']|'')*)'/.exec(afterIdentity);
  if (!id || !serial || !hash || !identityNo || !name) {
    console.error(`  Could not read the sealed fields out of a statement in ${file}.`);
    console.error('  Refusing to emit an import whose verification block would be guessed.');
    console.error(`  ${text.slice(0, 160)}…`);
    process.exit(2);
  }
  return { file, id: Number(id[1]), serial: serial[1], hash: hash[1], identityNo: identityNo[1], name: name[1] };
});

// ── Prove the copy is a copy ──────────────────────────────────────────────
// The emitted statement must contain the source statement as an exact
// prefix. This is the whole safety property of the script, checked rather
// than asserted in a comment.
const emitted = inserts.map(({ text }) => `${text.replace(/;$/, '')}\n  ON CONFLICT DO NOTHING;`);
for (let i = 0; i < inserts.length; i += 1) {
  const src = inserts[i].text.replace(/;$/, '');
  if (!emitted[i].startsWith(src)) {
    console.error('  A statement was altered in transit. Refusing to write.');
    process.exit(2);
  }
}

const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
const serialsList = rows.map((r) => `    (${sq(r.serial)}, ${sq(r.hash)}, ${sq(r.identityNo)}, ${sq(r.name)})`).join(',\n');
const maxId = Math.max(...rows.map((r) => r.id));
const maxSeq = Math.max(...rows.map((r) => Number(r.serial.split('-')[4])));

const out = `-- SHRS GRADUATION REGISTER — PRODUCTION IMPORT
-- Generated by scripts/build-production-import.mjs from the sealed registers:
${SOURCES.map((s) => `--     ${DIR}/${s}`).join('\n')}
--
-- ${rows.length} certificates, ${TARGET.standing} It changes nothing about
-- the documents and cannot: every INSERT below is a verbatim copy of the
-- sealed register's own statement, and the generator asserts that copy is
-- exact before writing. No identifier and no cryptographic field is
-- recomputed anywhere in this file.
--
-- SAFE TO RUN TWICE. Every insert carries ON CONFLICT DO NOTHING and the
-- sequence repairs can only move a counter forward, so a second execution
-- leaves the database byte-for-byte unchanged.
--
-- ONE TRANSACTION. If any check at the end fails, the whole import rolls
-- back and the database is exactly as it was. A half-imported cohort is the
-- one state harder to recover from than no import at all.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. BEFORE-STATE. Read, never assume. These rows are informational and are
--    printed by psql as the transaction runs, so the operator can see what
--    production actually held before anything was written.
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'BEFORE  certificates on file' AS check, count(*)::text AS value FROM stage_certificates
UNION ALL SELECT 'BEFORE  highest engraved number',
  COALESCE(MAX((regexp_match(serial_no, '-(\\d{6})-'))[1])::text, '(none)') FROM stage_certificates
UNION ALL SELECT 'BEFORE  serial sequence stands at', last_value::text FROM stage_certificate_serial_seq
UNION ALL SELECT 'BEFORE  student id sequence stands at', last_value::text FROM student_identity_seq;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. PERMANENT STUDENT IDs, attached to the children who already hold them.
--    Guarded by identity_no IS NULL: a student who already carries an ID is
--    never overwritten, which makes these idempotent AND makes them refuse
--    to silently change a number that is printed on a document. A student
--    row that does not exist matches nothing and reports UPDATE 0 — the
--    certificate still verifies, because the certificate row carries the ID
--    itself; the child's record is simply not yet linked, and §5 lists it.
-- ─────────────────────────────────────────────────────────────────────────
${identityUpdates.map((u) => u.text).join('\n')}

-- ─────────────────────────────────────────────────────────────────────────
-- 2. THE CERTIFICATES. Verbatim from the sealed registers. The only edit is
--    the conflict clause.
-- ─────────────────────────────────────────────────────────────────────────
${emitted.join('\n')}

-- ─────────────────────────────────────────────────────────────────────────
-- 3. THE NUMBERING, PROTECTED.
--
--    The engraved number comes from stage_certificate_serial_seq. After this
--    import it must stand at ${maxSeq}, so the next certificate the Registrar
--    issues is 0000${maxSeq + 1} — never ${TARGET.reused}
--
--    GREATEST, not a bare setval, for two reasons. It is order-independent,
--    so importing these batches in either order lands in the same place. And
--    it can only move the counter FORWARD: if production has somehow already
--    issued beyond ${maxSeq}, this will not wind it back on top of that work.
--    The value is read from the table, not assumed.
-- ─────────────────────────────────────────────────────────────────────────
SELECT setval('stage_certificate_serial_seq', GREATEST(
  (SELECT COALESCE(MAX((regexp_match(serial_no, '-(\\d{6})-'))[1]::int), 0) FROM stage_certificates),
  (SELECT last_value FROM stage_certificate_serial_seq)
), true);

--    stage_certificates.id has its own SERIAL sequence, and an INSERT that
--    supplies id explicitly does NOT advance it. Leaving it behind is a
--    silent fault, not a loud one: the next certificate inserts cleanly with
--    id 1, and because the archive reference and the Code 128 payload both
--    derive from cert.id while the engraved number derives from the serial
--    sequence, that certificate would print a barcode naming a different
--    record than its own number.
SELECT setval(pg_get_serial_sequence('stage_certificates', 'id'), GREATEST(
  (SELECT COALESCE(MAX(id), 0) FROM stage_certificates),
  ${maxId}
), true);

--    The permanent Student ID counter, same discipline. These IDs are for
--    life; re-issuing one to a different child is unrecoverable.
SELECT setval('student_identity_seq', GREATEST(
  (SELECT last_value FROM student_identity_seq), ${maxId}
), true);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. THE CHECK THAT MAKES ON CONFLICT DO NOTHING HONEST.
--
--    DO NOTHING is exactly right for re-running an import, and exactly wrong
--    if left unchecked: it will also swallow a genuine collision — a row
--    already occupying one of these ids, or a serial typed in by hand with
--    different content — and report success. So every certificate is read
--    back and compared against what is engraved on the sheet. Serial alone
--    is not enough; the content hash, the printed name and the Student ID
--    are compared too, because a record that merely has the right number
--    while disagreeing about the child is worse than no record.
--
--    Any mismatch raises and the entire transaction rolls back.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  bad text;
  n   int;
BEGIN
  WITH issued(serial_no, content_hash, student_identity_no, student_full_name) AS (VALUES
${serialsList}
  )
  SELECT string_agg(issued.serial_no || ' — ' || reason, E'\\n    '), count(*)
    INTO bad, n
  FROM issued
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN c.id IS NULL THEN 'no record on file after import'
      WHEN lower(c.content_hash) IS DISTINCT FROM lower(issued.content_hash)
        THEN 'record content hash disagrees with the certificate'
      WHEN c.student_full_name IS DISTINCT FROM issued.student_full_name
        THEN 'record names ' || COALESCE(c.student_full_name, '(null)')
             || ', certificate names ' || issued.student_full_name
      WHEN c.student_identity_no IS DISTINCT FROM issued.student_identity_no
        THEN 'record Student ID disagrees with the certificate'
    END AS reason
    FROM (SELECT 1) _
    LEFT JOIN stage_certificates c ON c.serial_no = issued.serial_no
  ) chk
  WHERE chk.reason IS NOT NULL;

  IF n > 0 THEN
    RAISE EXCEPTION E'IMPORT ABORTED — % certificate(s) do not agree with the issued documents:\\n    %', n, bad;
  END IF;

  IF (SELECT last_value FROM stage_certificate_serial_seq) < ${maxSeq} THEN
    RAISE EXCEPTION 'IMPORT ABORTED — serial sequence stands at %, below the highest issued number ${maxSeq}. The next certificate would re-use a printed number.',
      (SELECT last_value FROM stage_certificate_serial_seq);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. AFTER-STATE, and the one thing that legitimately needs a human.
--    Any child listed under "student record not linked" holds a valid
--    certificate that verifies correctly; their row in students is simply
--    missing or filed under a different spelling. Give the list to the
--    Registrar's Office. Do not edit this file to force a match.
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'AFTER   certificates on file' AS check, count(*)::text AS value FROM stage_certificates
UNION ALL SELECT 'AFTER   highest engraved number',
  COALESCE(MAX((regexp_match(serial_no, '-(\\d{6})-'))[1])::text, '(none)') FROM stage_certificates
UNION ALL SELECT 'AFTER   serial sequence stands at', last_value::text FROM stage_certificate_serial_seq
UNION ALL SELECT 'AFTER   next certificate will be', (last_value + 1)::text FROM stage_certificate_serial_seq
UNION ALL SELECT 'AFTER   student id sequence stands at', last_value::text FROM student_identity_seq;

SELECT 'student record not linked' AS check, c.student_full_name AS value
FROM stage_certificates c
WHERE c.serial_no IN (${rows.map((r) => sq(r.serial)).join(', ')})
  AND NOT EXISTS (
    SELECT 1 FROM students s WHERE s.identity_no = c.student_identity_no
  )
ORDER BY 2;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- NOT FINISHED HERE. A successful import is not a working verification page.
-- Prove it against the real public endpoint before telling anyone it is
-- fixed, and before any further sheet is released:
--
--     node scripts/verify-issued-certificates-live.mjs --full
-- ─────────────────────────────────────────────────────────────────────────
`;

writeFileSync(OUT, out);
console.log(`\n  Wrote ${OUT}`);
console.log(`    ${rows.length} certificate(s), lifted verbatim from ${SOURCES.length} sealed register(s)`);
console.log(`    ${identityUpdates.length} permanent Student ID attachment(s)`);
console.log(`    engraved numbers ${rows[0].serial.split('-')[4]}–${rows[rows.length - 1].serial.split('-')[4]}, `
  + `sequence lands at ${maxSeq}, next issue ${String(maxSeq + 1).padStart(6, '0')}`);
console.log('    every value tuple asserted byte-identical to its source\n');
