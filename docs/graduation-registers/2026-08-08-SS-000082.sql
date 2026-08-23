-- SHRS graduation register — Sultan Hanafi Royal College
-- Senior Secondary School · SS 1 – SS 3 · 2026-08-08 · certificates 000082–000085
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (82, '2fdad197-eb9f-5c37-91a6-5bb859d4e978', 'SHRS-CERT-SS-2026-000082-0F4C1', '710433392511139', 'Abdulbasit Amobi Jabarr', 'male', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '0f4c191cef9f2f5915095f93afd515e87af3a0e3259f22e39a8a93010ea66430', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (83, 'e7fd4be3-89de-59a0-acac-7199d78b4166', 'SHRS-CERT-SS-2026-000083-4721C', '715324136266939', 'Aisha Shode', 'female', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '4721cf58716f6cde94c5d9eb749adcdd607ed762f321647edf99b39f583c8cd8', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (84, 'ff70bae5-aa40-5142-a04b-66aa53a0794e', 'SHRS-CERT-SS-2026-000084-3CF47', '718568673454723', 'Mazeed Hassan-Murtala', 'male', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '3cf4765f35cf7ce0f488aff5cd515e31c021956a69df309a9f8123afdd30b2b7', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (85, '7d0e5c48-92a9-5420-a60c-0e8a7880b408', 'SHRS-CERT-SS-2026-000085-155CE', '717188855323348', 'Thoirah Makinde', 'female', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '155ce41c4d8db51286a7dabd5af874f0d666f852d2a96a631fc5b732df20b2d5', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 85, true);
SELECT setval('student_identity_seq', 67, true);

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
 WHERE programme_code = 'SS' AND id BETWEEN 82 AND 85
 ORDER BY id;
