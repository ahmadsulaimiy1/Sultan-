// Digital Graduate Profile (spec §1.3, document #10) — public, no
// session required, exactly like the other graduation-document public
// endpoints. Unlike Tier 1 verification (verify.js), which is scoped
// to exactly one document's reference number (spec §5.3 — "every query
// is scoped to exactly one reference number... never leak adjacent
// records"), this endpoint deliberately aggregates every document
// issued to one graduate. That's a wider information surface, so its
// safety comes from a different property: the lookup key is the
// Permanent Verification ID — a long, server-issued, non-guessable
// token (spec §3.2), never a name or admission number. There is no
// public name-based search anywhere in this system; only someone who
// already holds a specific graduate's verification ID (from a document
// they were given, or the graduate sharing it themselves) can reach
// this page. See docs/shrs-master-graduation-document-specification.md
// §5's privacy boundary for the reasoning this design follows.
//
// Response is the same audience-safe field set as Tier 1 verification
// (spec §5.1) — never grades, disciplinary history, or contact
// details — applied once per document in the list.
import { getSql } from '../../_lib/db.js';
import { json } from '../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const sql = getSql(env);
  if (!sql) return json({ error: 'The graduate profile is not available right now — no database is linked.' }, 500);

  const url = new URL(request.url);
  const verificationId = (url.searchParams.get('id') || '').trim();
  if (!verificationId) return json({ error: 'Provide a verification ID.' }, 400);

  try {
    const res = await sql`
      SELECT gd.id, gd.document_type, gd.document_kind, gd.reference_no, gd.issued_at, gd.revoked_at,
             gr.preferred_certificate_name, gr.full_legal_name, gr.graduation_session,
             s.identity_no, ci.name AS institution_name
      FROM graduation_documents gd
      JOIN graduation_records gr ON gr.id = gd.graduation_record_id
      LEFT JOIN students s ON s.id = gr.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN institutions ci ON ci.name = c.institution
      WHERE gd.verification_id = ${verificationId}
      ORDER BY gd.issued_at ASC`;

    if (!res.rows.length) {
      return json({ ok: true, found: false });
    }

    const first = res.rows[0];
    return json({
      ok: true,
      found: true,
      verificationId,
      recipientName: first.preferred_certificate_name || first.full_legal_name,
      institutionName: first.institution_name,
      graduationSession: first.graduation_session,
      permanentGraduateId: first.identity_no,
      documents: res.rows.map((row) => ({
        documentType: row.document_type,
        documentKind: row.document_kind,
        referenceNo: row.reference_no,
        issuedAt: row.issued_at,
        status: row.revoked_at ? 'revoked' : 'active',
        verifyUrl: `/verify-graduation-document/?ref=${encodeURIComponent(row.reference_no)}`,
      })),
    });
  } catch (err) {
    console.error('graduate profile error', err);
    return json({ error: 'Could not load that profile right now — please try again shortly.' }, 500);
  }
}
