-- SHRS graduation register — Sultan Hanafi Nursery and Primary School
-- Primary School · 2026-08-08 · certificates 000059–000064
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (59, '9445d630-6454-58dc-a71a-60b8a8701dd3', 'SHRS-CERT-PRY-2026-000059-C7997', '713145152825668', 'Aisha Lawal', 'female', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'c7997e5e05b4fb9e87890fef88699e92f3d4e38debb649972fa1e02a0b88e59d', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (60, '99c1c327-8452-596b-88d2-15e806727c82', 'SHRS-CERT-PRY-2026-000060-F3021', '716389690013455', 'Al-ameen Okoh', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'f3021611f9274129ccd69971367a2fd4cce2a4d703553a64b252896080a91e02', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (61, 'f252e986-0b78-5d14-9f0d-2a15893a49a2', 'SHRS-CERT-PRY-2026-000061-33E36', '717721632196601', 'Ashraf Korede Ojewumi', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '33e361cbe89cab700cbcdc0567dcb3e07b3c0f728dcab8ed9c051911357d1c8e', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (62, '79c7eda4-467c-5875-9870-166388875e5a', 'SHRS-CERT-PRY-2026-000062-91BD3', '719634227201249', 'Daud Aliu', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '91bd308a0cc4ec65ffb4d43998e4fbbc41d523cef648eff3578ad25f7eeb1bc8', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (63, '0bd1e0b8-f9c1-552c-ad54-d0aaf28d226f', 'SHRS-CERT-PRY-2026-000063-E9A53', '710966169384396', 'Imran Iremide Adegoke', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'e9a5393b78f2d1e314635fbcab203b5e21a54beece25b0a712cf9d84e5ce51db', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (64, '57dad779-855d-5a47-9b28-f72c0047b74d', 'SHRS-CERT-PRY-2026-000064-B2C46', '714477095008816', 'Naheemah Ismail', 'female', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'b2c46396e14b8b167ee6eae9f673f9ce0d8533712cb00a8513b46a2a7fb9c37a', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 64, true);
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
   AND sc.programme_code = 'PRY'
   AND s.full_name = sc.student_full_name
   AND (SELECT COUNT(*) FROM students s2 WHERE s2.full_name = sc.student_full_name) = 1;

-- Audit: every certificate in this batch, and whether it reached a student.
SELECT serial_no, student_identity_no, student_full_name,
       CASE WHEN student_id IS NULL THEN 'NOT LINKED — link by hand' ELSE 'linked' END AS student_record
  FROM stage_certificates
 WHERE programme_code = 'PRY' AND id BETWEEN 59 AND 64
 ORDER BY id;
