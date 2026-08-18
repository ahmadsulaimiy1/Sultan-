-- SHRS graduation register — Sultan Hanafi Royal College
-- Senior Secondary School · SS 1 – SS 3 · 2026-08-08 · certificates 000080–000083
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (80, '3b1184c1-36b7-57e7-b0f7-c88f55077d76', 'SHRS-CERT-SS-2026-000080-29DD5', '710433392511139', 'Abdulbasit Amobi Jabarr', 'male', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '29dd5055d87996f6c89851974af80f1fb59adf21b7885c17ba895d0e966b787e', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (81, '6bc8e0aa-ddf6-5f66-91c4-410537c85867', 'SHRS-CERT-SS-2026-000081-A3178', '712079599079145', 'Aisha Shode', 'female', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'a3178c9086d17833b35776f4bf663c8f9210285064d0440c4684ad21f4350fab', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (82, '3e3610a8-bb73-5904-87e6-a613cd919b41', 'SHRS-CERT-SS-2026-000082-5CC78', '715324136266939', 'Mazeed Hassan-Murtala', 'male', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '5cc78fb22f78ebdb7eceee76952be6aeec1ae4ce7297fff710dfb57fa09790df', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (83, '2343c9f0-744d-5c0d-ac58-c6e1d0a6cebf', 'SHRS-CERT-SS-2026-000083-AA6F4', '717188855323348', 'Thoirah Makinde', 'female', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'aa6f4a0ca1288a05820db2cb7e33eac671b863cbaf1a3e0a4911c6398cb6ee3e', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 83, true);
SELECT setval('student_identity_seq', 66, true);

-- ── Linking each certificate to its student record ───────────────────────
-- The rows above are complete and verifiable on their own: every certificate
-- is a SNAPSHOT, and the public verifier reads only the snapshot, so nothing
-- below is needed for a certificate to verify.
--
-- What it IS needed for is the Registrar's Office. stage_certificates.student_id
-- is the foreign key to students(id); until it is set, a certificate is
-- findable by any number printed on it but does NOT appear when a registrar
-- opens that student's record. This batch was minted from the Founder's roll
-- of names, not from student rows, so the issuer cannot set it — guessing a
-- foreign key from a name is exactly the kind of silent mismatch that ends
-- with one graduate's certificate filed under another graduate.
--
-- So the link is made here, deliberately, and only where it is unambiguous:
-- the UPDATE matches on the exact full name within this programme and refuses
-- any name that matches more or fewer than one active student. Run it AFTER
-- the JSS cohort exists in students, then run the audit query beneath it and
-- read the result: any row still showing NULL is a link a human must make.
UPDATE stage_certificates sc
   SET student_id = s.id
  FROM students s
 WHERE sc.student_id IS NULL
   AND sc.programme_code = 'SS'
   AND s.full_name = sc.student_full_name
   AND (SELECT COUNT(*) FROM students s2 WHERE s2.full_name = sc.student_full_name) = 1;

-- Audit: every certificate in this batch, and whether it reached a student.
SELECT serial_no, student_identity_no, student_full_name,
       CASE WHEN student_id IS NULL THEN 'NOT LINKED — link by hand' ELSE 'linked' END AS student_record
  FROM stage_certificates
 WHERE programme_code = 'SS' AND id BETWEEN 80 AND 83
 ORDER BY id;
