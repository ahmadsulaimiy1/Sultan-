-- SHRS graduation register — Sultan Hanafi Qur’an College
-- Hifz of the Glorious Qur’an · 2026-08-08 · certificates 000048–000050
--
-- grade_en is written even though it is never printed: the content hash is
-- taken over it, and the public verifier recomputes it from this column. A
-- row imported without it verifies as tampered.

INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (48, 'f87e5a9a-8d5a-5ed2-8db4-f1d870022aa0', 'SHRS-CERT-QUR-2026-000048-64881', '717988020633236', 'Aisha Omoshalewa Anofi', 'female', 'QUR', 'Hifz of the Glorious Qur’an', 'Sultan Hanafi Royal Schools — Sultan Hanafi Qur’an College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '6488133848a46191f61d2043c191a8609eb7b635a1ea9b39899ffcb2e86728b3', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (49, '01c27ca7-532d-510d-9599-b3eed949ca9f', 'SHRS-CERT-QUR-2026-000049-1E924', '710699780947768', 'Baqi Olamiposi Anofi', 'male', 'QUR', 'Hifz of the Glorious Qur’an', 'Sultan Hanafi Royal Schools — Sultan Hanafi Qur’an College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '1e9243d7cbc60da3bccf82eeef1794999a44cb004afc27e639f05843670553b3', 3);
INSERT INTO stage_certificates (id, credential_id, serial_no, student_identity_no, student_full_name, student_sex, programme_code, programme_label_en, institution_name, academic_year, grade_en, grade_ar, place_en, issued_at, content_hash, hash_key_version) VALUES (50, '64047284-0043-5313-9eea-c952f9bd06dd', 'SHRS-CERT-QUR-2026-000050-1FBB5', '716922466886710', 'Zaynab Zakariya Anofi', 'female', 'QUR', 'Hifz of the Glorious Qur’an', 'Sultan Hanafi Royal Schools — Sultan Hanafi Qur’an College', '2025/2026', 'Excellent', NULL, 'Ikorodu, Lagos, Nigeria', '2026-08-08', '1fbb5cf55454a4c002ef3b5993bb8067b200393b9b11f8f96789e02f4a5f3796', 3);

-- Move the sequences past what this batch consumed, so the next issuance
-- cannot mint a number that is already engraved on a printed document.
SELECT setval('stage_certificate_serial_seq', 50, true);
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
   AND sc.programme_code = 'QUR'
   AND s.full_name = sc.student_full_name
   AND (SELECT COUNT(*) FROM students s2 WHERE s2.full_name = sc.student_full_name) = 1;

-- Audit: every certificate in this batch, and whether it reached a student.
SELECT serial_no, student_identity_no, student_full_name,
       CASE WHEN student_id IS NULL THEN 'NOT LINKED — link by hand' ELSE 'linked' END AS student_record
  FROM stage_certificates
 WHERE programme_code = 'QUR' AND id BETWEEN 48 AND 50
 ORDER BY id;
