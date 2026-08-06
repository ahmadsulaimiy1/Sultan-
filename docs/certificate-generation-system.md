# SHRS Certificate Generation System

**Status:** Built 2026-08-05 under the Certificate Generation Directive.
**Scope:** Academic stage-completion certificates (Ibtidā'iyyah first; I'dādiyyah,
Thanawiyyah pre-registered), issued at cohort scale from an uploaded roster.

## 1. What this system is

The client designed the Ibtidā'iyyah certificate in Canva ("Ibtida'iyyah
certificate.pdf", located in the connected Canva account and analysed for this
build). This system turns that design into a data-driven issuance engine: the
Registrar uploads a student list once, and the system matches or creates each
student record, assigns permanent Student IDs, issues one uniquely serialled
certificate per student, and renders print-ready bilingual documents —
individually or as one multi-page batch.

It is deliberately a **third document family**, sibling to the thin
`certificates` register (one-off typed entries, two-party approval) and the
`graduation_documents` ecosystem (clearance-chain-gated Class A–C documents).
A stage certificate is issued for a whole cohort as one administrative act on
the authority of published results; the other two lifecycles remain untouched.

## 2. Identifier architecture (client-approved formats)

Two identifiers, deliberately separate so one student can hold many uniquely
verifiable documents across their academic life:

| Identifier | Format | Example | Nature |
|---|---|---|---|
| Student ID | `SHRS-STU-<YYYY>-NG-<seq6>` | `SHRS-STU-2026-NG-000154` | Permanent, one per person, never changes |
| Certificate serial | `SHRS-CERT-<PROG>-<YYYY>-<seq6>-<SUFFIX5>` | `SHRS-CERT-IBT-2026-000001-6AEB5` | Unique per document, never reused |

- `<PROG>`: programme code — `IBT` (Ibtidā'iyyah), `IDD` (I'dādiyyah), `THN`
  (Thanawiyyah). Adding a stage is one line in
  `functions/_lib/certificate-serial.js`, never a migration.
- `<seq6>`: a real, atomic PostgreSQL sequence (`stage_certificate_serial_seq`),
  global across years and programmes — a number, once issued, is never reused.
- `<SUFFIX5>`: the anti-forgery segment — the first five hex characters of the
  certificate's HMAC-SHA-256 content hash (keyed by `DOCUMENT_HASH_SECRET`,
  same secret discipline as the graduation-document family). A forger can
  invent a plausible serial but cannot compute a matching suffix without the
  secret; the public verifier re-derives it on every lookup.
- Student IDs already issued in the earlier `SHRS-<YYMMDD>-<seq6>` shape are
  left exactly as issued — permanence beats format uniformity. New assignments
  use the new format; the admin-only bulk regeneration action remains for a
  deliberate migration.

## 3. Security model

1. **Atomic serials** — no COUNT(*)+1 races; the sequence can never hand the
   same number to two certificates.
2. **HMAC-SHA-256 content hash** over a canonical field set (serial base,
   Student ID, name, programme, academic year, grade, issue date), stored per
   certificate; the 12-character display hash printed on the document derives
   from it.
3. **Anti-forgery serial suffix** derived from that hash (above).
4. **Live public verification** — `/verify-certificate/?ref=<serial>` queries
   the certificate database on every scan; the QR on each certificate encodes
   exactly this URL. Verification recomputes the hash AND the suffix
   (timing-safe comparison) — a tampered database row and a fabricated serial
   both surface as `integrity_check_failed`, never as valid.
5. **Verification logging** — every public lookup writes to
   `verification_log` (hashed IP, outcome) for anomaly review.
6. **Immutable snapshots** — the certificate row snapshots names, grade,
   programme, and both calendars' dates at issuance; later edits to a student
   record can never silently rewrite an issued certificate. Corrections are
   revoke (with a mandatory note, shown to public verifiers) + reissue.
7. **Permission-checked, audit-logged issuance** — batch generation is an act
   of the `certificates` area's C permission (Registrar), logged with counts;
   revocation is logged per certificate.

## 4. The rendered document

`functions/_lib/stage-certificate-template.js` — the ROYAL FLAGSHIP
EDITION (v3), governed by `docs/shrs-certificate-editorial-bible.md`
(the standards document every design decision must cite): an engraved-document
composition in the strict brand palette (coffee brown / royal gold /
ivory, limited crimson, minimal navy, no green). All ornament is
constructed geometry, not stock decoration: parametric epitrochoid
guilloché (border bands, centre prestige field, seal and medallion
rings), arabesque strapwork border with khatam corner medallions, a
serial-carrying microtext ring, parchment grain and foil grain via SVG
turbulence, a milled-edge gold award medallion with crimson/navy
ribbons, an engraved certificate-ID plaque, a blind-embossed official
seal, a gold/silver holographic foil strip, and gold-foil student-name
lettering (metallic gradient + engraved stroke + emboss shadows).
Typography: Cinzel / Cinzel Decorative / Cormorant Garamond (EN),
Aref Ruqaa / Amiri / Reem Kufi (AR). Layout per the client's header
architecture — crests + English titles upper-left, medallion + ID
plaque + Arabic titles upper-right, side-by-side bilingual titles:

- ONE A4 landscape page, both languages (Arabic right-anchored, English left).
- Masthead: Nigeria coat of arms + SHRS crest, Federal Republic line,
  institution name in both languages, School of Islamic and Arabic Studies.
- Recipient block with الطالب/الطالبة (sex-driven Arabic grammar: لإتمامه/لإتمامها,
  وحصوله/وحصولها), name in both scripts.
- Identity strip: permanent Student ID + certificate serial as bordered chips.
- Bilingual completion citation and place; dual date line — Gregorian and
  Hijri (Umm al-Qura via ICU, computed once at issuance and snapshotted;
  8 August 2026 = 25 Ṣafar 1448). NO performance grade appears on the
  certificate or in its public verification (Editorial Bible §1.5 —
  client-mandated): grades stay stored for the future Transcript /
  Statement of Results.
- Registrar (المسجّلة) + Head of the School (رئيس المدرسة) signature lines.
- QR verification block with the printed verify URL.
- Void-if-altered clause in both languages + HMAC display hash strip.
- Batch rendering: one multi-page document, `page-break-after` per sheet, for
  a single print/PDF run of a whole cohort.

PDF export uses the existing Cloudflare Browser Rendering path
(`functions/_lib/pdf-render.js`, `?format=pdf`) with `preferCSSPageSize`
honouring the template's `@page A4 landscape`; the browser Print path works
regardless.

## 5. Endpoints

- `POST /api/portal/staff/registrar/stage-certificates` — actions:
  `preview_roster` (validate + match, changes nothing), `generate_batch`
  (find-or-create students → permanent IDs → serials → certificate rows),
  `list_register`, `list_batches`, `revoke`.
- `GET  /api/portal/staff/registrar/stage-certificates?serial=…[&format=pdf]`
  — one certificate; `?batch=<batchNo>` — the whole batch as one document.
- `GET  /api/certificates/verify?ref=<serial>` — public verification (extended;
  also still serves the legacy register + Ijazah families).
- `GET  /api/certificates/qr?ref=<serial>` — QR SVG (pre-existing, generic).

Roster matching: by admission number when supplied (authoritative), else
case-insensitive exact full name. An ambiguous name (two students, one name)
is reported with the candidate admission numbers, never guessed. New names
get a full student record, a generated admission number, and a permanent
Student ID. Existing blank `full_name_ar`/`sex` fields are enriched from the
roster; verified values are never overwritten. Duplicate protection: a
student with an active certificate for the same programme + academic year is
skipped, with the existing serial reported.

## 6. Staff UI

`/portal/staff/certificate-centre/` — the Certificate Generation Centre
(linked from the Registrar's Office): batch setup (programme, academic year,
issue date, places), roster paste/CSV upload with header detection,
preview-and-validate table, one-click cohort generation with per-row results,
batch register with whole-batch print links, and a searchable certificate
register with open/PDF/verify/revoke actions.

## 7. Schema

`sql/schema.sql` (mirrored in `functions/api/portal/setup.js`):
`stage_certificate_serial_seq`, `stage_certificate_batches`,
`stage_certificates`, plus `students.full_name_ar` / `students.sex`.
Run the setup endpoint once after deploy to apply.

## 8. Honest limitations / future work

- **PDF rendering** requires the `BROWSER` binding (Cloudflare Browser
  Rendering) in production — unverifiable from this sandboxed environment;
  the HTML + browser-print path works regardless. Same standing caveat as
  the graduation-document family.
- **Hijri dates** come from the runtime's ICU `islamic-umalqura` calendar
  (verified correct in this environment); if a runtime lacked it, the Hijri
  line is omitted rather than mis-computed.
- **Signatures** are signature *lines* (as in the client's design), not
  digital signature images; the seal-asset system used by graduation
  documents can be wired in when the client supplies the School's seal for
  this document family.
- The batch issuance loop is sequential per row (Neon HTTP driver has no
  cross-statement transactions); a mid-batch failure reports per-row status
  honestly rather than pretending atomicity.
