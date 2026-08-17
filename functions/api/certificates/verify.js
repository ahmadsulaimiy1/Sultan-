// Public certificate/Ijazah verification — no session required by
// design: the whole point is that anyone holding a physical certificate
// (an employer, another school, a scholarship board) can confirm it's
// genuine without a Digital Campus account. This is the IQ-02 §7.5
// "public third-party verification endpoint" the Ijazah Governance
// Framework already anticipated when ijazah_register was designed
// (see sql/schema.sql's comment on that table).
//
// Looked up by the same `reference_no` already printed/quoted on the
// certificate — no separate secret token. That's a deliberate choice,
// not an oversight: reference numbers are staff-assigned at issuance
// (never self-service), so nothing here lets a stranger register a
// fake one, and the fields returned (name, credential, dates, status)
// are exactly what a certificate is meant to prove to a third party —
// not sensitive account data. The real anti-forgery mechanism is that
// this result is pulled live from the database every time: a forged
// document can print any reference number it likes, but it can't make
// this endpoint return a match, and a revoked credential shows as
// revoked no matter how convincing the physical copy looks.
import { getSql } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';
import {
  parseStageCertificateIdentifier, resolveStageCertificateIdentifier,
  displayStageCertificateNo, verifyStageCertificateIntegrity, isoDateOnly,
} from '../../_lib/certificate-serial.js';
import { RC_PROGRAMMES } from '../../_lib/royal-college-certificate.js';
import { hashIpAddress } from '../../_lib/document-hash.js';

// The public attestation must use the award's OWN name. The Islamic-stage
// certificates are Certificates of Completion; every Royal College award —
// JSS, SS, and now NUR/PRY as they join the Registrar's issuing route — is a
// Certificate of Graduation, and a verifier comparing this page against the
// document in their hand must read the same words on both.
//
// This used to be a lookup table with exactly one entry (JSS), hand-added
// when Junior Secondary shipped and never revisited when SS, PRY and QUR
// joined RC_PROGRAMMES — so a Primary certificate's own template already
// printed "Primary School Graduation Certificate" while this endpoint would
// have told a verifier "Certificate of Completion — Primary School": correct
// award, wrong words, on the one page whose entire job is confirming the two
// match. Reading straight from RC_PROGRAMMES instead of a hand-kept list
// means a programme's public wording can no longer drift from what its own
// sheet says — there is only the one place either is written.
function credentialTypeEn(row) {
  const prog = RC_PROGRAMMES[String(row.programme_code || '').toUpperCase()];
  if (prog) {
    // A variant-bearing award (only QUR today) names itself per student, not
    // by the programme alone — see the identical guard in
    // royal-college-certificate.js's sheetHtml. award_variant is issuance-time
    // wording, not a stored column (scripts/issue-royal-college-batch.mjs
    // never writes one back to the row), so a QUR row with no resolvable
    // variant falls through to the generic default below — the same thing
    // this endpoint already did for every Royal College programme before
    // this fix — rather than printing a made-up title.
    const award = prog.variants ? prog.variants[String(row.award_variant || '').toUpperCase()] : prog;
    if (award && award.title) return `${award.title} — ${award.labelEn || prog.labelEn}`;
  }
  return `Certificate of Completion — ${row.programme_label_en}`;
}


// The Code 128-C holder barcode carries the 15-digit Student ID with ONE
// leading zero, because Code 128-C encodes digits in pairs and therefore needs
// an even-length payload. A registrar who scans that barcode into this endpoint
// sends 16 digits, and the parser — which knows the Student ID as 15 digits —
// refused it. The consequence was the worst failure this system can produce:
// a genuine certificate, scanned with the scanner it was designed for, told
// "no certificate found", which reads to everyone in the room as an accusation
// of forgery.
//
// Normalising here rather than in certificate-serial.js is deliberate: that
// file is inside the v1.0 freeze and is the numbering authority. Nothing about
// the numbering changes — this only undoes a transport-layer padding before
// the identifier is parsed, and only for the one shape that padding produces
// (exactly 16 digits, leading zero, a valid 15-digit ID underneath). Anything
// else is passed through untouched and fails closed as before.
function undoBarcodePadding(ref) {
  const s = String(ref || '').trim();
  return /^0\d{15}$/.test(s) ? s.slice(1) : s;
}

// Best-effort verification audit (same verification_log the graduation-
// document verifier writes) — a failed log write must never break a
// legitimate verification.
async function logVerification(sql, request, refNo, outcome) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null;
    await sql`
      INSERT INTO verification_log (document_reference_no, ip_hash, outcome)
      VALUES (${refNo}, ${hashIpAddress(ip)}, ${outcome})`;
  } catch (logErr) {
    console.error('verification_log write failed', logErr);
  }
}

// One place decides what a stage certificate's state IS, so the single
// attestation below and the disambiguation list cannot come to different
// conclusions about the same row. A hash check that throws (missing
// DOCUMENT_HASH_SECRET on a deployment) is reported as an integrity
// failure, never as "intact" by default.
//
// 'key_unavailable' is deliberately NOT treated as a failure here, the same
// precedent already established in graduation-documents/verify.js: a
// deployment missing a signing key is an operator's gap, not evidence a
// document was altered, and publicly branding a genuine certificate as
// failed over an unset environment variable is the exact harm this
// distinction exists to prevent. The suffix cross-check is kept regardless —
// it compares two values already stored on the row and needs no key, so it
// remains a real guard even when the deeper signature can't be recomputed.
// `contentVerified` carries the honest, narrower fact (was the cryptographic
// hash itself recomputed and matched) for anything that wants it.
function stageCertificateState(env, row) {
  let integrity = { hashValid: false, suffixValid: false, reason: undefined };
  try {
    integrity = verifyStageCertificateIntegrity(env, row);
  } catch (hashErr) {
    console.error('stage certificate integrity check unavailable', hashErr);
  }
  const keyUnavailable = integrity.reason === 'key_unavailable';
  const contentVerified = integrity.hashValid && integrity.suffixValid;
  const intact = integrity.suffixValid && (integrity.hashValid || keyUnavailable);
  return {
    intact,
    contentVerified,
    signaturePending: intact && keyUnavailable,
    status: !intact ? 'integrity_check_failed' : row.revoked_at ? 'revoked' : 'active',
    outcome: !intact ? 'hash_mismatch' : keyUnavailable ? 'key_unavailable' : row.revoked_at ? 'revoked' : 'valid',
  };
}

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'Verification is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return json({ error: 'Provide a certificate or Ijazah reference number.' }, 400);

  try {
    // Academic Stage Certificates (Certificate Generation Directive,
    // 2026-08-05). Tried first because every shape in this family is
    // recognisable by form alone, and verified DEEPER than the register
    // families below: beyond row lookup, the HMAC-SHA256 content hash is
    // recomputed over the stored fields and the serial's printed
    // anti-forgery suffix is re-derived from it, so a tampered record or a
    // fabricated serial surfaces as an integrity failure instead of
    // quietly verifying.
    //
    // EVERY identifier the sheet prints is accepted — stored serial,
    // engraved number (with or without its check tail), Student ID,
    // verification code, Code 128-C payload, archive path, document id —
    // because a holder types whichever number is nearest the QR code, and
    // being told "no certificate found" about a genuine document reads as
    // an accusation of forgery. See parseStageCertificateIdentifier for
    // the shapes and for why each one fails closed. What the verifier
    // typed only chooses the row: the integrity check is identical either
    // way, because it recomputes from the STORED serial.
    const stageRef = undoBarcodePadding(ref);
    const identifier = parseStageCertificateIdentifier(stageRef);
    const resolved = identifier ? await resolveStageCertificateIdentifier(sql, stageRef) : null;
    if (resolved && resolved.outcome === 'ambiguous') {
      // Two rows where the identifier names one document means the global
      // serial sequence has been re-scoped, a content hash has collided, or
      // a record has been duplicated. Never pick one.
      await logVerification(sql, request, ref, 'ambiguous');
      return json({ error: 'That number matches more than one record. Contact the Registrar’s Office.' }, 409);
    }
    if (resolved && resolved.outcome === 'multiple') {
      // A Student ID names a PERSON. A student who completed Ibtida'iyyah
      // and then I'dadiyyah holds two certificates under one ID, so this is
      // a correct academic record, not a fault — but it is still not an
      // attestation, because no single document has been identified. The
      // holder is handed the certificate numbers off their own documents
      // and asked which one they mean; nothing here is picked for them.
      // The public page (js/certificate-verify.js) has its own branch for
      // kind 'student_certificate_index' and renders it as an index, never as
      // a verdict — checked by reading that file, not by trusting this note.
      await logVerification(sql, request, ref, 'multiple');
      const rows = resolved.rows;
      return json({
        ok: true,
        found: true,
        kind: 'student_certificate_index',
        status: 'multiple_matches',
        studentIdentityNo: rows[0].student_identity_no,
        recipientName: rows[0].student_full_name,
        recipientNameAr: rows[0].student_full_name_ar,
        matchCount: rows.length,
        matches: rows.map((r) => {
          const state = stageCertificateState(env, r);
          return {
            serialNo: r.serial_no,
            certificateNo: displayStageCertificateNo(r.serial_no),
            programmeCode: r.programme_code,
            credentialType: credentialTypeEn(r),
            credentialTypeAr: r.programme_label_ar ? `شهادة إتمام ${r.programme_label_ar}` : null,
            academicYear: r.academic_year,
            issuedAt: isoDateOnly(r.issued_at),
            status: state.status,
          };
        }),
      });
    }
    if (resolved && resolved.outcome === 'resolved') {
      const row = resolved.rows[0];
      const state = stageCertificateState(env, row);
      await logVerification(sql, request, ref, state.outcome);
      // A revoked certificate that was REISSUED names its successor, so
      // the holder (and any verifier) is pointed at the document that
      // now attests the award. Tolerant of a database that predates the
      // reissue schema: it simply has no successor to name.
      let supersededBy = null;
      if (row.revoked_at) {
        try {
          const succ = await sql`
            SELECT serial_no FROM stage_certificates
            WHERE replaces_serial_no = ${row.serial_no} LIMIT 1`;
          supersededBy = succ.rows[0] ? succ.rows[0].serial_no : null;
        } catch (succErr) {
          // Only a database that predates the reissue schema is a
          // legitimate "no successor to name". Any OTHER failure must
          // surface — silently answering "revoked" while hiding a real
          // replacement is the exact misleading answer this field
          // exists to prevent.
          if (!/replaces_serial_no/.test((succErr && succErr.message) || '')) throw succErr;
        }
      }
      return json({
        ok: true,
        found: true,
        kind: 'stage_certificate',
        serialNo: row.serial_no,
        referenceNo: row.serial_no,
        // The number as ENGRAVED on the sheet, so a verifier comparing the
        // result against the document in their hand sees the same string.
        certificateNo: displayStageCertificateNo(row.serial_no),
        recipientName: row.student_full_name,
        recipientNameAr: row.student_full_name_ar,
        studentIdentityNo: row.student_identity_no,
        credentialType: credentialTypeEn(row),
        credentialTypeAr: row.programme_label_ar ? `شهادة إتمام ${row.programme_label_ar}` : null,
        programmeCode: row.programme_code,
        institutionName: row.institution_name,
        academicYear: row.academic_year,
        // No grade fields: Editorial Bible §1.5 — the certificate (and
        // therefore its public attestation) certifies completion only;
        // performance data belongs to the Transcript / Statement of
        // Results. grade_en/grade_ar stay stored for those documents.
        issuedAt: isoDateOnly(row.issued_at),
        issuedAtHijri: row.issued_at_hijri,
        batchNo: row.batch_no,
        integrity: state.signaturePending ? 'pending_signature' : state.intact ? 'intact' : 'integrity_check_failed',
        contentVerified: state.contentVerified,
        status: state.status,
        revokedAt: row.revoked_at,
        revocationNote: row.revoked_at ? row.revocation_note : null,
        // Reissue linkage: which serial this document replaced, and —
        // when this one is revoked — which serial replaced it.
        replacesSerialNo: row.replaces_serial_no || null,
        supersededBySerialNo: supersededBy,
      });
    }
    // A well-formed stage identifier that matched nothing still falls
    // through: the older certificate and Ijazah families use free-form
    // staff-assigned reference numbers, and short-circuiting here would
    // hide a genuine match in one of them behind a shape coincidence.
    const cert = await sql`
      SELECT certificate_type, student_full_name, reference_no, issued_at, revoked_at, revocation_note
      FROM certificates WHERE reference_no = ${ref}`;
    if (cert.rows.length) {
      const row = cert.rows[0];
      await logVerification(sql, request, row.reference_no, row.revoked_at ? 'revoked' : 'valid');
      return json({
        ok: true,
        found: true,
        kind: 'certificate',
        referenceNo: row.reference_no,
        recipientName: row.student_full_name,
        credentialType: row.certificate_type,
        issuedAt: row.issued_at,
        status: row.revoked_at ? 'revoked' : 'active',
        revokedAt: row.revoked_at,
        revocationNote: row.revoked_at ? row.revocation_note : null,
      });
    }

    const ijazah = await sql`
      SELECT student_full_name, reference_no, granted_date, examining_scholars, certified_scope, revoked_at, revocation_note
      FROM ijazah_register WHERE reference_no = ${ref}`;
    if (ijazah.rows.length) {
      const row = ijazah.rows[0];
      await logVerification(sql, request, row.reference_no, row.revoked_at ? 'revoked' : 'valid');
      return json({
        ok: true,
        found: true,
        kind: 'ijazah',
        referenceNo: row.reference_no,
        recipientName: row.student_full_name,
        credentialType: 'Ijazah — Qur’an Memorisation Certification',
        certifiedScope: row.certified_scope,
        examiningScholars: row.examining_scholars,
        issuedAt: row.granted_date,
        status: row.revoked_at ? 'revoked' : 'active',
        revokedAt: row.revoked_at,
        revocationNote: row.revoked_at ? row.revocation_note : null,
      });
    }

    // Audit trail for a failed public lookup — but only for a reference
    // whose SHAPE this institution issued. That distinction is the whole
    // point: a well-formed number that resolves to nothing is the signal
    // §3.7 tamper detection exists for (a forged sheet being checked, or a
    // record that has gone missing), and until now it left no trace at all.
    // Logging arbitrary strings instead would let an unauthenticated
    // endpoint fill verification_log with rows on demand, drowning exactly
    // the signal the table is for.
    if (identifier) await logVerification(sql, request, ref, 'not_found');
    // TWO DIFFERENT ANSWERS, and until now they were the same one.
    //
    // `identifier` is non-null only when the reference is a shape THIS
    // INSTITUTION ISSUES — a stage-certificate serial, engraved number,
    // Student ID, verification code, archive path or document id. The
    // endpoint already relied on that distinction to decide whether to write
    // an audit row, and then discarded it, returning the identical
    // `{found:false}` for "this is not one of our numbers" and for "this IS
    // one of our numbers and we hold no record of it".
    //
    // Those are not the same fact and must not read the same way. The second
    // is what a graduand holding a genuine certificate sees when the record
    // behind it is missing, and answering that with an undifferentiated "not
    // found" tells a real awardee, in public, that their document appears to
    // be nothing — which is the accusation this whole family of code is
    // written to avoid. It is also the institution's own alarm: a well-formed
    // number with no row means a record has gone missing or was never
    // created, and nobody can act on a signal that looks like a typo.
    //
    // So the shape is reported. It is not a verdict and is never rendered as
    // one: `found` stays false, no status is asserted, and nothing here says
    // the document is genuine — only that the number is one of ours.
    return json({
      ok: true,
      found: false,
      referenceRecognised: Boolean(identifier),
      referenceKind: identifier ? identifier.kind : null,
    });
  } catch (err) {
    console.error('certificate verify error', err);
    return json({ error: 'Could not complete verification: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
