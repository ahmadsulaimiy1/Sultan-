-- SHRS graduation register — Sultan Hanafi Nursery and Primary School
-- Primary School · 2026-08-08 · certificates 000056–000061
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (56, 'SHRS-CERT-PRY-2026-000056-52FC6', '716656078450081', 'Aisha Lawal', 'female', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '52fc69b02e0bc1d7933fdcd956abde268db88e2b2975354879a72c4944e2a9bd', 3);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (57, 'SHRS-CERT-PRY-2026-000057-341A7', '719900615637876', 'Al-ameen Okoh', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '341a7d43a6d7b7bdcabfa7549ebd66a593fccf2b9487ab91a9d1bfc82161c872', 3);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (58, 'SHRS-CERT-PRY-2026-000058-FE5E3', '717721632196601', 'Ashraf Korede Ojewumi', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'fe5e3baf94e2247798e2cbdd5c8e1290d55a360f38fca50c645c211253b4995e', 3);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (59, 'SHRS-CERT-PRY-2026-000059-D277B', '713145152825668', 'Daud Aliu', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'd277b016be9d57f44431ee73bac897130bb4cbb408d61b602dfd8ca64558bbec', 3);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (60, 'SHRS-CERT-PRY-2026-000060-B52D7', '710966169384396', 'Imran Iremide Adegoke', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'b52d79434105d455b32bcef7a5ac402e8c41b57cd5b0a0868d7c2a69c5cf83ff', 3);
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (61, 'SHRS-CERT-PRY-2026-000061-00887', '714477095008816', 'Naheemah Ismail', 'female', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '0088747adb95ce21510243f721dc087eacdc844d1de5ebe7ecca58699a39e8b3', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 61, true);
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
   AND sc.programme_code = 'PRY'
   AND s.full_name = sc.student_full_name
   AND (SELECT COUNT(*) FROM students s2 WHERE s2.full_name = sc.student_full_name) = 1;

-- Audit: every certificate in this batch, and whether it reached a student.
SELECT serial_no, student_identity_no, student_full_name,
       CASE WHEN student_id IS NULL THEN 'NOT LINKED — link by hand' ELSE 'linked' END AS student_record
  FROM stage_certificates
 WHERE programme_code = 'PRY' AND id BETWEEN 56 AND 61
 ORDER BY id;
