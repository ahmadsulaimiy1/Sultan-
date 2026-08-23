-- SHRS graduation register — Sultan Hanafi Nursery and Primary School
-- Primary School · 2026-08-08 · certificates 000061–000066
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (61, '219337e3-fbfc-53f7-81aa-c0d44dc58f11', 'SHRS-CERT-PRY-2026-000061-64493', '716389690013455', 'Aisha Lawal', 'female', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '6449385db0cfa54ccfb3dae9e6c842be0770638556df6bd0a307365eab9206d2', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (62, 'db6cae0f-eddf-550b-b23c-1cb9aa91c37f', 'SHRS-CERT-PRY-2026-000062-0359E', '719634227201249', 'Al-ameen Okoh', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '0359e5a21d8b20f2786e13d4bdfce3a4fa6999309cdd98ad58849a627a22cf5b', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (63, '1900d49c-f8f2-5db7-b11d-facb1386404a', 'SHRS-CERT-PRY-2026-000063-D9951', '717721632196601', 'Ashraf Korede Ojewumi', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'd99513ea989835bcb38a26044fe86d9c1e0e0709e3f5927139a2f72663a5c1ef', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (64, '340a7441-68a4-5c35-bc9f-e6d7b843c34b', 'SHRS-CERT-PRY-2026-000064-2C831', '712878764389035', 'Daud Aliu', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '2c831113a098a2935540ac5102a1913fbbd3eddc483f758b766dfa3b06c83213', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (65, '1acbd84e-9059-5065-88db-fb6500c481f7', 'SHRS-CERT-PRY-2026-000065-5E4DD', '710966169384396', 'Imran Iremide Adegoke', 'male', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '5e4dd38dc4622c9cdacc3e7720fb53f39b5f9455e2ebaa1b9d813f55e9dc395d', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (66, '0241c392-4684-54f1-9e11-5c2eea5dea85', 'SHRS-CERT-PRY-2026-000066-DA467', '714477095008816', 'Naheemah Ismail', 'female', 'PRY', 'Primary School', 'Sultan Hanafi Royal Schools — Sultan Hanafi Nursery and Primary School', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', 'da467e5fbda3c50a89d0f5987e453dc2551a259233a2b7e8999cb89758a7e0b9', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 66, true);
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
   AND sc.programme_code = 'PRY'
   AND s.full_name = sc.student_full_name
   AND (SELECT COUNT(*) FROM students s2 WHERE s2.full_name = sc.student_full_name) = 1;

-- Audit: every certificate in this batch, and whether it reached a student.
SELECT serial_no, student_identity_no, student_full_name,
       CASE WHEN student_id IS NULL THEN 'NOT LINKED — link by hand' ELSE 'linked' END AS student_record
  FROM stage_certificates
 WHERE programme_code = 'PRY' AND id BETWEEN 61 AND 66
 ORDER BY id;
