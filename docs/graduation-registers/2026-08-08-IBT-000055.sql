-- SHRS graduation register import.
-- Student numbers are permanent and already printed, so they are seeded
-- rather than generated, and the sequence is advanced past them so the
-- registrar never re-issues one of these values to a different student.
UPDATE students SET identity_no = '716656078450081' WHERE full_name = 'Ameerah Abdulhafeez' AND identity_no IS NULL;
UPDATE students SET identity_no = '713944318135552' WHERE full_name = 'Faridah Ayomide Aliu' AND identity_no IS NULL;
UPDATE students SET identity_no = '717455243759974' WHERE full_name = 'Muhammad Ismail Seriki' AND identity_no IS NULL;
SELECT setval('student_identity_seq', 66, true);

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (55, '40e6c648-7b63-5c43-8b61-2bb91083c01e', 'SHRS-CERT-IBT-2026-000055-1F758', '716656078450081', 'Ameerah Abdulhafeez', 'أميرة عبد الحفيظ', 'female', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '1f75871a518addca3b1ddd4c3aa7b75b74ad74e1a0b15f97cf2953313005736b', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (56, '559ab3d1-21ab-5695-b02f-b89242f874c3', 'SHRS-CERT-IBT-2026-000056-C1244', '713944318135552', 'Faridah Ayomide Aliu', 'فريدة أيومدي علي', 'female', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', 'c1244ebafe3792355c4ee1abfe801d60710c6075dc7a4268c34ef770b3b4c3f7', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (57, '37a0d8a5-cff6-55e0-a324-f526f169affb', 'SHRS-CERT-IBT-2026-000057-91D78', '717455243759974', 'Muhammad Ismail Seriki', 'محمد إسماعيل سركي', 'male', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '91d78e9b1dd6d3343a5371dfbdf952143e7d06385874549a355e5f91a5d0732b', 3);

-- The sequence name is stage_certificate_serial_seq (sql/schema.sql).
-- An earlier version of this file said stage_certificate_seq, which does
-- not exist. That is not a cosmetic slip: if the sequence is not advanced
-- past these certificates, the Registrar re-issues 000035 to a different
-- student in a later year — and because the number PRINTED on the
-- certificate is now SHRS-CERT-IBT-000035 with no year, those two
-- documents would carry the identical printed number.
SELECT setval('stage_certificate_serial_seq', 57, true);

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
              GREATEST((SELECT MAX(id) FROM stage_certificates), 57), true);

-- Make the PRINTED number unique in the database, not merely unique by
-- convention. serial_no already has a UNIQUE constraint, but two rows
-- differing only in year and hash suffix satisfy it while collapsing to
-- the same engraved number. This index is what actually forbids that.
CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq
  ON stage_certificates ((split_part(serial_no, '-', 3) || '-' || split_part(serial_no, '-', 5)));
