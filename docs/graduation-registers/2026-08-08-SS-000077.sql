-- SHRS graduation register — Sultan Hanafi Royal College
-- Senior Secondary School · SS 1 – SS 3 · 2026-08-08 · certificates 000077–000080
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (77, '6dff2c42-b05a-5acc-b638-4725235d551b', 'SHRS-CERT-SS-2026-000077-BC006', '710433392511139', 'Abdulbasit Amobi Jabarr', 'male', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'bc0060183b55ed254da6f0929c03bc17c0a55254394796807163788b7dfc203d', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (78, '4463c322-cde8-548c-a7b5-24427deb9840', 'SHRS-CERT-SS-2026-000078-76263', '715590524703564', 'Aisha Shode', 'female', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '762638a6c75b9d4821df49c9ecf6fe7b4436469e3ec12fa5fed964df7a956e8c', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (79, '3433a325-3dc3-557e-8f62-1d7a87dd8b4c', 'SHRS-CERT-SS-2026-000079-3F6AD', '718835061891356', 'Mazeed Hassan-Murtala', 'male', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '3f6ad34678c06c48e2b95dad9e3d3abd8a13d725d0f8bea74fa3ec21c7505a67', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (80, '0efda1a2-4b7b-589d-8b4d-50f0fe96d543', 'SHRS-CERT-SS-2026-000080-9260B', '717188855323348', 'Thoirah Makinde', 'female', 'SS', 'Senior Secondary School · SS 1 – SS 3', 'Sultan Hanafi Royal Schools — Sultan Hanafi Royal College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '9260b4bd9395d81800f1d57d24cb06788f91c21bbede43f7d7b6c975cc66014c', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 80, true);
SELECT setval('student_identity_seq', 64, true);

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
 WHERE programme_code = 'SS' AND id BETWEEN 77 AND 80
 ORDER BY id;
