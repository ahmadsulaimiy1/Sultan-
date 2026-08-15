-- SHRS graduation register import.
-- Student numbers are permanent and already printed, so they are seeded
-- rather than generated, and the sequence is advanced past them so the
-- registrar never re-issues one of these values to a different student.
UPDATE students SET identity_no = '711232557821021' WHERE full_name = 'Abdulbasit Adedokun' AND identity_no IS NULL;
SELECT setval('student_identity_seq', 64, true);

INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (51, 'SHRS-CERT-TMH-2026-000051-B6558', '711232557821021', 'Abdulbasit Adedokun', 'عبد الباسط أددوكن', 'male', 'TMH', 'Tamhīdiyyah — Preparatory Stage', 'المرحلة التمهيدية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', 'b65588663012ffb1b5760db18c4e5307a6ea14ebfe708bb70fa2c7b02b3876c2', 3);

-- The sequence name is stage_certificate_serial_seq (sql/schema.sql).
-- An earlier version of this file said stage_certificate_seq, which does
-- not exist. That is not a cosmetic slip: if the sequence is not advanced
-- past these certificates, the Registrar re-issues 000035 to a different
-- student in a later year — and because the number PRINTED on the
-- certificate is now SHRS-CERT-IBT-000035 with no year, those two
-- documents would carry the identical printed number.
SELECT setval('stage_certificate_serial_seq', 51, true);

-- stage_certificates.id has a sequence of its own (id SERIAL PRIMARY KEY —
-- sql/schema.sql), and an INSERT that supplies id explicitly, as every row
-- above does, does NOT advance it. Advancing the serial sequence alone is
-- therefore not enough, and the failure is silent rather than loud: every
-- id below this batch is still free, so the next certificate issued through
-- the Registrar UI inserts cleanly and gets id 1.
--
-- That decouples two numbers the certificate prints side by side. The
-- archive reference and the Code 128 payload both derive from cert.id
-- (stage-certificate-template.js:1240-1242 — ARCH/<PROG>/<year>/<id6> and
-- <year><id6>), while the engraved certificate number derives from the
-- serial sequence. A certificate numbered 000048 would carry archive
-- reference ARCH/IDD/2026/000001 and scan as 2026000001 — a document whose
-- barcode and whose number name two different records.
--
-- pg_get_serial_sequence resolves the sequence from the column rather than
-- assuming its name, and MAX(id) makes the statement independent of the
-- order the registers are imported in: importing IBT after IDD must not
-- wind the sequence back to this batch's own last id.
SELECT setval(pg_get_serial_sequence('stage_certificates', 'id'),
              GREATEST((SELECT MAX(id) FROM stage_certificates), 51), true);

-- Make the PRINTED number unique in the database, not merely unique by
-- convention. serial_no already has a UNIQUE constraint, but two rows
-- differing only in year and hash suffix satisfy it while collapsing to
-- the same engraved number. This index is what actually forbids that.
CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq
  ON stage_certificates ((split_part(serial_no, '-', 3) || '-' || split_part(serial_no, '-', 5)));
