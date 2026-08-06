-- SHRS graduation register import.
-- Student numbers are permanent and already printed, so they are seeded
-- rather than generated, and the sequence is advanced past them so the
-- registrar never re-issues one of these values to a different student.
UPDATE students SET identity_no = '714743483445443' WHERE full_name = 'Hameedah Adebimpe Ojewumi' AND identity_no IS NULL;
UPDATE students SET identity_no = '717988020633236' WHERE full_name = 'Aisha Anofi' AND identity_no IS NULL;
UPDATE students SET identity_no = '711232557821021' WHERE full_name = 'Abdulbasit Adedokun' AND identity_no IS NULL;
UPDATE students SET identity_no = '714477095008816' WHERE full_name = 'Naheemah Ismail' AND identity_no IS NULL;
UPDATE students SET identity_no = '717721632196601' WHERE full_name = 'Ashrof Akorede' AND identity_no IS NULL;
UPDATE students SET identity_no = '710966169384396' WHERE full_name = 'Imran Adegoke' AND identity_no IS NULL;
UPDATE students SET identity_no = '714210706572189' WHERE full_name = 'Abdulateef Adedokun' AND identity_no IS NULL;
SELECT setval('student_identity_seq', 41, true);

INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (35, 'SHRS-CERT-IBT-2026-000035-368DC', '714743483445443', 'Hameedah Adebimpe Ojewumi', 'حميدة أدبيمبي أوجومي', 'female', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '368dcfc6b85d292928dc961ffaf9fc5e2f010e2c77bb51efe96700c1e0f55c2a');
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (36, 'SHRS-CERT-IBT-2026-000036-B9E10', '717988020633236', 'Aisha Anofi', 'عائشة حنفي', 'female', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', 'b9e10eaf65e69aafc03b73f12267a87046778208e857c720a1c275d039a4a7e9');
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (37, 'SHRS-CERT-IBT-2026-000037-22C49', '711232557821021', 'Abdulbasit Adedokun', 'عبد الباسط أددوكن', 'male', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '22c4933df6f5888a0bfda2bf9d8650b345c2565755290ed50ddc6eefa93f6392');
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (38, 'SHRS-CERT-IBT-2026-000038-2944F', '714477095008816', 'Naheemah Ismail', 'نعيمة إسماعيل', 'female', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '2944f25ab89a79dab78b4aa5d536eeb7288afa15ce372d336f37809eaa9405ce');
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (39, 'SHRS-CERT-IBT-2026-000039-518A8', '717721632196601', 'Ashrof Akorede', 'أشرف أكوردي', 'male', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '518a886ac51546922006ad4f507638400ab558b9a3926314f723f7142f59eb99');
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (40, 'SHRS-CERT-IBT-2026-000040-60DAF', '710966169384396', 'Imran Adegoke', 'عمران أدغكي', 'male', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '60daf10c4deafc4518cab95c61b5ea2dcb584152318dddd1388644430cb6f923');
INSERT INTO stage_certificates (id, serial_no, student_identity_no, student_full_name, student_full_name_ar, student_sex, programme_code, programme_label_en, programme_label_ar, institution_name, academic_year, place_en, place_ar, issued_at, issued_at_hijri, issued_at_hijri_ar, content_hash) VALUES (41, 'SHRS-CERT-IBT-2026-000041-6F66F', '714210706572189', 'Abdulateef Adedokun', 'عبد اللطيف أددوكن', 'male', 'IBT', 'Ibtida’iyyah — Primary Stage', 'المرحلة الابتدائية', 'Sultan Hanafi Royal Schools — School of Islamic & Arabic Studies', '2025/2026', 'Ikorodu, Lagos, Nigeria', 'إكورودو، لاغوس، نيجيريا', '2026-08-08', '25 Ṣafar 1448 A.H.', '25 صفر 1448هـ', '6f66f5435e5737d63886f66142275693c8b2089aa8577ad6e56a389c63ce1103');

-- The sequence name is stage_certificate_serial_seq (sql/schema.sql).
-- An earlier version of this file said stage_certificate_seq, which does
-- not exist. That is not a cosmetic slip: if the sequence is not advanced
-- past these certificates, the Registrar re-issues 000035 to a different
-- student in a later year — and because the number PRINTED on the
-- certificate is now SHRS-CERT-IBT-000035 with no year, those two
-- documents would carry the identical printed number.
SELECT setval('stage_certificate_serial_seq', 41, true);

-- Make the PRINTED number unique in the database, not merely unique by
-- convention. serial_no already has a UNIQUE constraint, but two rows
-- differing only in year and hash suffix satisfy it while collapsing to
-- the same engraved number. This index is what actually forbids that.
CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq
  ON stage_certificates ((split_part(serial_no, '-', 3) || '-' || split_part(serial_no, '-', 5)));
