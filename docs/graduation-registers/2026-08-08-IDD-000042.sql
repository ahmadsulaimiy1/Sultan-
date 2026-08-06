-- SHRS graduation register import.
-- Student numbers are permanent and already printed, so they are seeded
-- rather than generated, and the sequence is advanced past them so the
-- registrar never re-issues one of these values to a different student.
UPDATE students SET identity_no = '717455243759974' WHERE full_name = 'Muhammad Ismail Seriki' AND identity_no IS NULL;
UPDATE students SET identity_no = '710699780947768' WHERE full_name = 'Baqi Olamiposi Anofi' AND identity_no IS NULL;
UPDATE students SET identity_no = '713944318135552' WHERE full_name = 'Faridah Ayomide Aliu' AND identity_no IS NULL;
UPDATE students SET identity_no = '717188855323348' WHERE full_name = 'Thoirah Makinde' AND identity_no IS NULL;
UPDATE students SET identity_no = '710433392511139' WHERE full_name = 'Abdulbasit Amobi Jabarr' AND identity_no IS NULL;
UPDATE students SET identity_no = '713677929698929' WHERE full_name = 'Abdullah Oladimeji Anofi' AND identity_no IS NULL;
SELECT setval('student_identity_seq', 47, true);

INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (42, 'SHRS-CERT-IDD-2026-000042-56798', '717455243759974', 'Muhammad Ismail Seriki', 'محمد إسماعيل سركي', 'male', 'IDD', 'I’dādiyyah — Intermediate Stage', 'المرحلة الإعدادية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '567985893c87a55b2c3725add799b7461f19825a5a830ba874e74ff9495cab70', 2);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (43, 'SHRS-CERT-IDD-2026-000043-6EEAF', '710699780947768', 'Baqi Olamiposi Anofi', 'باقي أولاميبوسي حنفي', 'male', 'IDD', 'I’dādiyyah — Intermediate Stage', 'المرحلة الإعدادية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '6eeafeda366645ca99755a1198d5d938c453638587b13a20cef52f3b7bf00999', 2);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (44, 'SHRS-CERT-IDD-2026-000044-8B125', '713944318135552', 'Faridah Ayomide Aliu', 'فريدة أيومدي علي', 'female', 'IDD', 'I’dādiyyah — Intermediate Stage', 'المرحلة الإعدادية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '8b125e6ff74814d640e051884678a1f4b55c8366a2172c308b368f6889352e94', 2);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (45, 'SHRS-CERT-IDD-2026-000045-F546F', '717188855323348', 'Thoirah Makinde', 'طاهرة مكيندي', 'female', 'IDD', 'I’dādiyyah — Intermediate Stage', 'المرحلة الإعدادية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', 'f546f2d29269ef7ac03a9b2b833924785bee3e39e9a2247a9a7373a5a99eb0e1', 2);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (46, 'SHRS-CERT-IDD-2026-000046-7E37A', '710433392511139', 'Abdulbasit Amobi Jabarr', 'عبد الباسط أموبي جبار', 'male', 'IDD', 'I’dādiyyah — Intermediate Stage', 'المرحلة الإعدادية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '7e37aa8660cf5764f4ad48844ccaeb47fb2b299961b773da3fe6755e45f1a049', 2);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, grade_en, grade_ar, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash, hash_key_version) VALUES (47, 'SHRS-CERT-IDD-2026-000047-CB9F5', '713677929698929', 'Abdullah Oladimeji Anofi', 'عبد الله أولاديميجي حنفي', 'male', 'IDD', 'I’dādiyyah — Intermediate Stage', 'المرحلة الإعدادية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', 'cb9f5e12f5df45df8c896afec6f770772d4bde5985c08f216b5efaa9dd8ca954', 2);

-- The sequence name is stage_certificate_serial_seq (sql/schema.sql).
-- An earlier version of this file said stage_certificate_seq, which does
-- not exist. That is not a cosmetic slip: if the sequence is not advanced
-- past these certificates, the Registrar re-issues 000035 to a different
-- student in a later year — and because the number PRINTED on the
-- certificate is now SHRS-CERT-IBT-000035 with no year, those two
-- documents would carry the identical printed number.
SELECT setval('stage_certificate_serial_seq', 47, true);

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
              GREATEST((SELECT MAX(id) FROM stage_certificates), 47), true);

-- Make the PRINTED number unique in the database, not merely unique by
-- convention. serial_no already has a UNIQUE constraint, but two rows
-- differing only in year and hash suffix satisfy it while collapsing to
-- the same engraved number. This index is what actually forbids that.
CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq
  ON stage_certificates ((split_part(serial_no, '-', 3) || '-' || split_part(serial_no, '-', 5)));
