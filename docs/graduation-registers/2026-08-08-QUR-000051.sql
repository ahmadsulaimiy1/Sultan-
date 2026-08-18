-- SHRS graduation register — Sultan Hanafi Qur’an College
-- Hifz of the Glorious Qur’an · 2026-08-08 · certificates 000051–000053
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (51, '813e02e7-d90b-5bcc-bf81-642e71088309', 'SHRS-CERT-QUR-2026-000051-890BF', '717988020633236', 'Aisha Omoshalewa Anofi', 'female', 'QUR', 'Hifz of the Glorious Qur’an', 'Sultan Hanafi Royal Schools — Sultan Hanafi Qur’an College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '890bf4bca1618975c05a14be26df5da073f84a18a1ecd0187bad4b0c0c8d8033', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (52, '4d3a35db-442d-5d42-bb10-cd77b23429ab', 'SHRS-CERT-QUR-2026-000052-0BFD3', '710699780947768', 'Baqi Olamiposi Anofi', 'male', 'QUR', 'Hifz of the Glorious Qur’an', 'Sultan Hanafi Royal Schools — Sultan Hanafi Qur’an College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '0bfd30841933c6c585e83962990dd1c68060eb1892108c9482a3ea969e6ef933', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (53, 'c86a85f8-2723-5ff5-aae5-fbe141653b38', 'SHRS-CERT-QUR-2026-000053-7556C', '713411541262298', 'Zaynab Zakariya Anofi', 'female', 'QUR', 'Hifz of the Glorious Qur’an', 'Sultan Hanafi Royal Schools — Sultan Hanafi Qur’an College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '7556c80b8d963ae55af71445756bfdb0165edc7f04fcf37a0a2f6f6fae4e5c6e', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 53, true);
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
   AND sc.programme_code = 'QUR'
   AND s.full_name = sc.student_full_name
   AND (SELECT COUNT(*) FROM students s2 WHERE s2.full_name = sc.student_full_name) = 1;

-- Audit: every certificate in this batch, and whether it reached a student.
SELECT serial_no, student_identity_no, student_full_name,
       CASE WHEN student_id IS NULL THEN 'NOT LINKED — link by hand' ELSE 'linked' END AS student_record
  FROM stage_certificates
 WHERE programme_code = 'QUR' AND id BETWEEN 51 AND 53
 ORDER BY id;
