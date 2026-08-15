# SHRS Certificate Cryptographic Integrity Audit

**Prepared in response to the Founder's Critical Directive of 2026-08-15.**
**No signing key generated. No certificate minted. No record modified. This document is evidence-gathering only.**

---

## 0. Scope, method, and what this document does NOT claim

This audit was built strictly from:

- The live production database, queried through the public, unauthenticated verification endpoint (`GET /api/certificates/verify`) — the same endpoint a parent's browser calls. **Zero write operations were performed.**
- The full git history of this repository (all commits, all branches reachable from `origin`), read directly — not summarised from memory or an earlier session's notes.
- The repository's own governance documents: `docs/certificate-key-deployment.md`, `docs/graduation-registers/canonical-roll-2026.json`, `docs/graduation-registers/reissue-plan-2026.json`, `docs/shrs-arabic-names-for-ruling-2026.md`.
- The actual source code that performs signing and verification: `functions/_lib/document-hash.js`, `functions/_lib/certificate-serial.js`, `functions/api/certificates/verify.js`, `scripts/issue-certificate-batch.mjs`.

**The Founder's correction is adopted as the governing assumption throughout:** *every certificate is presumed already printed and awarded to a student unless proven otherwise.* This document is careful to separate two questions that must never be collapsed into one:

1. **Institutional issuance** — was a physical document printed and handed to a student? This is a real-world fact. **Nothing in a git repository or a database can prove or disprove it.** Where this document says "no evidence of issuance was found," that means exactly that — an absence of evidence in the systems I have access to — and explicitly **does not** mean "this was not issued." Only the Registrar, the Founder, or the physical documents themselves can answer this question, and Section 4 says so plainly for every one of the 31.
2. **Cryptographic signing** — does a database row with a computed HMAC signature exist for this certificate number? This **is** provable from the evidence available here, exhaustively, and Section 2 and Section 4 prove it by direct query rather than by absence-of-file inference.

Everything below is dated and sourced. Where a claim rests on a live check, the exact commit, timestamp, and query method are given so the check can be independently repeated.

**Pinned evidence baseline:**
- Repository commit at time of live check: `afb80e8724c1a19c36aa0126ffa4f87bbb74adc5` (`main`)
- Live database check performed: 2026-08-15T03:48:39Z–03:50:09Z UTC
- Live check tool: `scripts/audit-certificate-presence.mjs`, run via GitHub Actions workflow `certificate-presence-audit.yml`, run ID `31862779664` (public log: `https://github.com/ahmadsulaimiy1/Sultan-/actions/runs/31862779664`)
- Live check method: for every candidate sequence number 1–150, GET `https://shroyalschools.com/api/certificates/verify?ref=2026<seq zero-padded to 6>`. This is the **archive-barcode** identifier shape (`functions/_lib/certificate-serial.js`, `parseStageCertificateIdentifier`), which resolves by `stage_certificates.id = <seq> AND year(issued_at) = 2026` — the one lookup path that does **not** require guessing a programme code first, because every certificate this project has ever inserted was given a primary-key `id` equal to its sequence number (confirmed against the actual `INSERT` statements in `docs/graduation-registers/2026-08-08-IBT-000035.sql` and `…IDD-000042.sql`). This is stated as a limitation, not hidden: if that convention were ever violated for a row, this method would under-report it. No such violation was found anywhere in the register files or import scripts.

---

## 1. Summary of findings (read this first)

| Question | Answer | Evidence |
|---|---|---|
| How many certificates have EVER had a database row created for them, at any point in this project's history? | **13** — sequence numbers 000035 through 000047 | Live query, all 150 candidate numbers, Section 2 |
| Do all 13 still verify on the live production site right now? | **Yes**, all show `status: active`. 7 (IBT) show full cryptographic confirmation (`intact`); 6 (IDD) show `pending_signature` (record confirmed, signature check unavailable — an honest, non-alarming state, not a forgery signal) | Live query, Section 2 |
| Were the other 31 certificates in the Registrar's roll ever cryptographically signed? | **No signed database record exists for any of them, under any programme code, in the sequence range 1–150.** This is demonstrated by direct query, not inferred from a missing file. | Section 2, Section 4 |
| Does that mean the other 31 were never printed or given to students? | **This document cannot say, and does not claim to say.** That is a fact about the physical world, not about this codebase or its database, and per the Founder's directive it is not assumed either way. See Section 4.7. |
| Is the missing `DOCUMENT_HASH_SECRET` (v2) the reason the other 31 don't verify? | **No.** v2 was used exactly once, for the 6 IDD certificates already accounted for above. Nothing in the 31 was ever signed with v2, v1, or any key — there is no signed artefact for a lost key to have destroyed. | Section 3, Section 4 |
| Would generating a new key today change the cryptographic identity of any of the 13 already-issued certificates? | **No, provably not — see the mathematical/procedural proof in Section 5.** | Section 5 |
| Is generating a new key and signing the remaining 44−13=31 certificates today recommended? | **Not yet — see Section 8.** The blocking question is not cryptographic; it is institutional: what is actually printed on the physical documents already in students' hands, if any. That must come from the Registrar, not from this repository. |

---

## 2. The certificate ledger

### 2.1 Certificates with a live, queryable database record (13)

Every field below was read directly from the live production response on 2026-08-15 (timestamps in the "Live check" column), not copied from an earlier session's notes.

| Cert # | Student (as stored) | Programme | Session | DB row exists? | Signed? | Key version | Signing artefact | Live status | Live integrity |
|---|---|---|---|---|---|---|---|---|---|
| 000035 | Hameedah Adebimpe Ojewumi | IBT | 2025/2026 | **Yes** | **Yes** | v1 | `docs/graduation-registers/2026-08-08-IBT-000035.sql` (commit history: `7090fddd` batch build, `f24544fe` production import) | active | **intact** (full cryptographic confirmation) |
| 000036 | Aisha Anofi | IBT | 2025/2026 | Yes | Yes | v1 | same file | active | intact |
| 000037 | Abdulbasit Adedokun | IBT | 2025/2026 | Yes | Yes | v1 | same file | active | intact |
| 000038 | Naheemah Ismail | IBT | 2025/2026 | Yes | Yes | v1 | same file | active | intact |
| 000039 | Ashrof Akorede | IBT | 2025/2026 | Yes | Yes | v1 | same file | active | intact |
| 000040 | Imran Adegoke | IBT | 2025/2026 | Yes | Yes | v1 | same file | active | intact |
| 000041 | Abdulateef Adedokun | IBT | 2025/2026 | Yes | Yes | v1 | same file | active | intact |
| 000042 | Muhammad Ismail Seriki | IDD | 2025/2026 | Yes | Yes | **v2** | `docs/graduation-registers/2026-08-08-IDD-000042.sql`, `hash_key_version = 2` explicit | active | **pending_signature** (record confirmed against the Registrar's file; the v2 key that would recompute the cryptographic proof is not present in this deployment — an operator gap, not a mismatch) |
| 000043 | Baqi Olamiposi Anofi | IDD | 2025/2026 | Yes | Yes | v2 | same file | active | pending_signature |
| 000044 | Faridah Ayomide Aliu | IDD | 2025/2026 | Yes | Yes | v2 | same file | active | pending_signature |
| 000045 | Thoirah Makinde | IDD | 2025/2026 | Yes | Yes | v2 | same file | active | pending_signature |
| 000046 | Abdulbasit Amobi Jabarr | IDD | 2025/2026 | Yes | Yes | v2 | same file | active | pending_signature |
| 000047 | Abdullah Oladimeji Anofi | IDD | 2025/2026 | Yes | Yes | v2 | same file | active | pending_signature |

**Institutional issuance status for these 13:** the reissue-plan (`docs/graduation-registers/reissue-plan-2026.json`, Founder-ratified 8 August 2026) records that these are physical certificates already in circulation, and separately proposes 6 KEEP / 4 REISSUE / 3 REVOKE against the Registrar's roll. **That plan has not been executed against the live database** — all 13 currently verify under their original 2026-08-08 numbers, including the 3 the plan proposes to revoke and the 4 it proposes to replace. This is a live discrepancy between the ratified plan and the deployed state, noted here as fact, not acted on — the Founder previously said this needs Registrar review before execution, and nothing here executes it.

### 2.2 The remaining certificates in the Registrar's roll (31 further awards, 44 total)

`docs/graduation-registers/canonical-roll-2026.json` (the Registrar's own roll, Founder-ratified 8 August 2026) lists 44 total awards across 7 categories for 31 children. Of those 44 target awards, 13 correspond to the certificates in §2.1 above (6 of which the ratified plan keeps as-is; the other 7 replaced/superseded/voided under the same plan). The remaining registrar-roll categories and counts:

| Category code | Registrar column | Count | Any of these have a DB row? |
|---|---|---|---|
| QUR | Qur'an college | 4 | **No — checked, none found** |
| TMH | Islamiyyah (Tamyidi) | 1 | **No — checked, none found** |
| IDD (net, after plan) | Idadiyah | 5 | Partially covered by §2.1's 6 IDD rows above; net roll count differs due to plan revocations |
| PRY | Basic 5 | 6 | **No — checked, none found** |
| JSS | JSS 3 | 15 | **No — checked, none found** |
| SS | SSS 3 | 4 | **No — checked, none found** |

`docs/graduation-registers/reissue-plan-2026.json`'s `toMint` array names 38 specific planned certificates (sequence numbers 48–85) with real student names, programme codes, and identity numbers, carried from the Registrar's roll. **This is planning data — a proposal with names and target sequence numbers — not a signed or issued document.** It contains no `content_hash`, no signing key version, no printed suffix, and no confirmed print/issuance date. It cannot be treated as evidence of issuance, and it is not treated as such here.

For every one of these planned/roll-listed certificates — the full ledger row would read:

| Field | Value for all 31 |
|---|---|
| DB row exists? | **No** — confirmed by direct live query, sequence numbers 1–34 and 48–150, 2026-08-15T03:48–03:50 UTC (see §4 for the full method and the complete not-found list) |
| Ever generated (a real serial + hash computed)? | **No evidence found.** No sealed register, no `dist/certificates/` output, no SQL/JSON import file exists anywhere in this repository's git history for any programme code other than IBT and IDD. |
| Ever digitally signed? | **No** — a signature cannot exist without a generation step, and none was found |
| Signing key version / timestamp / artefact | N/A — none exists |
| Current live verification status | `found: false` for every one tested |
| **Was it printed and given to a student?** | **Not knowable from this repository.** This is the question Section 4.7 addresses directly: absence of a database row is not evidence either way about a piece of paper. |

---

## 3. Formal key history

| Key | Created | Purpose | First use | Last use | Certificates signed | Current status | Recovery possible? |
|---|---|---|---|---|---|---|---|
| **v1** | Undated in repo; committed as a plaintext development literal at `scripts/issue-certificate-batch.mjs` (per `functions/_lib/document-hash.js`'s own comment, "the development literal committed in plaintext…and used to sign the 2026-08-08 Ibtida'iyyah batch") | Original signing key, used before key-versioning existed | 2026-08-08 (IBT batch, 7 certificates: 000035–000041) | 2026-08-08 (same batch; retired immediately after, before any second use) | **7** (000035–000041) | **Retired, not lost.** Present in Cloudflare as `DOCUMENT_HASH_SECRET_V1` (confirmed by the read-only Cloudflare env audit, `cloudflare-env-audit.yml`, prior run). `document-hash.js` refuses to let anything sign with it again (`RETIRED_KEYS[1]` throws on signing attempts). It may verify forever. | N/A — not lost. Its value is deliberately never re-committed to the repository (see `document-hash.js`'s own comment on why), but it exists as a live Cloudflare secret today. |
| **v2** | 2026-08-06, "64 bytes from the OS CSPRNG" (`docs/certificate-key-deployment.md` §5), fingerprint `24bb0f683233486a` | Production signing key, replacing the compromised (repo-committed) v1 | 2026-08-06 — used **once**, to re-mint the 6 I'dādiyyah certificates (000042–000047) that day | 2026-08-06 — same single event; no second batch was ever signed with it | **6** (000042–000047) | **Lost.** Confirmed absent from both Cloudflare Production and Preview environments (`cloudflare-env-audit.yml` prior run: `DOCUMENT_HASH_SECRET` not present in either environment's key list). The delivery document itself (`certificate-key-deployment.md` §3) states there was exactly one copy, in a file "delivered separately," instructed to be deleted after installation, with no second backup ever confirmed made. | **No** — per the key's own custody documentation: "the hash cannot be recomputed, so the public verifier cannot confirm the record matches what was issued, and no amount of engineering recovers it." This is a 64-byte CSPRNG value with zero structure to reconstruct. |
| **v3 or later** | **Not generated.** No `DOCUMENT_HASH_KEY_VERSION` bump beyond 2 was found anywhere in this repository's history, current Cloudflare configuration, or any script. | — | — | — | **0** | Does not exist | N/A |

**Key fact bearing directly on the Founder's Critical Correction:** v2 signed exactly 6 documents, all already accounted for in §2.1. It was never used for QUR, TMH, PRY, JSS, or SS. Losing v2 therefore affects only those 6 — it is not, and cannot be, the reason the other 31 lack a database record. Their absence predates and is independent of the v2 loss.

---

## 4. Proof of the 31-certificate claim (per-item evidence, not inference)

The Founder's directive requires this to be demonstrated per certificate, not concluded from a repository search. This section gives the demonstration.

### 4.1 No signature exists (for any of the 31)

A signature, in this system, is the `content_hash` column on a `stage_certificates` row, computed by `computeDocumentHash()` (`functions/_lib/document-hash.js`) at the moment a row is inserted. A signature cannot exist independent of a row. §4.2 proves no row exists; therefore no signature exists. This is not circular — it is the actual mechanism: the hash is not a separate artefact stored anywhere else; it lives on the row or nowhere.

### 4.2 No database record exists (direct proof, not absence-of-file inference)

This is the one claim in this section that does **not** rest on "I searched the repository and found nothing" — it rests on a live query against the production database itself, performed 2026-08-15T03:48:39Z–03:50:09Z UTC, described fully in §0. The complete result:

- **Sequence numbers checked:** 1 through 150 (chosen to safely bracket both the pre-2026-08-08 range and the reissue plan's stated `allocatedThrough: 85`, with 65 numbers of headroom beyond that).
- **Found:** exactly 13 — sequences 35–47, matching §2.1 precisely, no more and no fewer.
- **Not found:** every other number in the range — 1 through 34 (34 numbers) and 48 through 150 (103 numbers) — **137 in total**, including every one of the 38 specific sequence numbers (48–85) named in `reissue-plan-2026.json`'s `toMint` list.
- **Errors:** 0. Every query returned a clean, well-formed JSON response from the live endpoint.

This method queries by database row id directly (§0's archive-barcode explanation) — it does not depend on knowing or guessing a programme code, so it could not have missed a QUR, TMH, PRY, JSS, or SS row by asking under the wrong category.

### 4.3 No signed QR code exists

The QR payload encodes the full stored serial number (`js/certificate-verify.js`, `functions/_lib/qrcode.js` usage in `scripts/issue-certificate-batch.mjs`'s `qrSvgForPrint` call). A QR payload is generated from a row's serial number at the moment the batch-issuance script renders the print sheet — it is not a separate signing act. Since no row was ever created for these 38 sequence numbers (§4.2), no QR encoding a genuine signed serial for them was ever generated by this system. (This says nothing about whether a QR code of *any* kind appears on a physical document already printed by some other means — see §4.7.)

### 4.4 No signed verification code exists

The printed verification code is the first 12 hex characters of `content_hash` (`functions/_lib/certificate-serial.js` comment, and `verify.js`'s `verify_code` lookup path, which does a prefix match against `content_hash`). No `content_hash` exists for these 38 (§4.1/§4.2), so no verification code derived from a real signature exists for them either.

### 4.5 No issued certificate exists in this system's own records

"Issued," within this codebase, means a row in `stage_certificates`. §4.2 is definitive on this point for the current production database. Separately, the only two **sealed register files** — the project's own artefact for "this batch was actually produced and is real" — that exist anywhere in this repository's git history are `2026-08-08-IBT-000035.{json,md,sql}` and `2026-08-08-IDD-000042.{json,md,sql}` (confirmed by directory listing and by `git log --all --diff-filter=A` across every branch). No register exists, and none was ever created and later deleted (confirmed: `git log --all --diff-filter=A --name-only | grep -i 'QUR\|TMH\|PRY-\|JSS-\|SS-000'` returns only prose mentions in commit messages about page content, never a register filename).

### 4.6 No database record represents a completed signed certificate — restated for clarity

Combining 4.1–4.5: there is no row, no hash, no QR, no verification code, and no register file, for any of the 38 planned sequence numbers, anywhere this audit has access to look. Every one of these is a direct consequence of the same underlying fact proven in §4.2 by live query, not five separate assumptions.

### 4.7 No distributed document exists — **THIS CLAIM IS NOT PROVEN, AND IS NOT CLAIMED**

This is the one item in the Founder's required list that a code and database audit **cannot answer**, and per the Founder's own Critical Correction, it must not be assumed in either direction. To be explicit:

- This audit does **not** claim that no physical document was ever printed for any of the 31.
- The commit history shows **real, approved visual/artwork template work** for at least a JSS certificate design (`cc7b5da`, `8e8e97f`, `d084ed1`, `cb5bbce`, `5ad2e5c`, `963d815` — "JSS Certificate: first-principles rebuild for genuine prestige," etc.), which was explicitly built and visually verified against **sample data**, with its own commit message stating plainly: *"Visual template only: no signatory map entry, no issuance endpoint, no JSS Transcript companion layout yet."* A template being production-ready for rendering is a separate fact from any specific student's document having been rendered and handed out from it.
- A screenshot already provided in this engagement shows a real device querying the live verification page for `SHRS-CERT-JSS-000048`, receiving "No record on file for this number" — and the Founder has stated that certificate is already in a student's possession. This audit has no way to independently confirm or deny that from the repository or database; it is taken as a fact reported by the Founder, not as something this document proves.
- **Conclusion for this item:** whether physical documents exist for some, all, or none of the remaining 31 is a question only the Registrar's Office, the Founder, or the physical documents themselves can answer. This audit supplies the cryptographic and database side of the picture (§4.1–4.6, fully proven) and explicitly declines to guess at the institutional side.

---

## 5. Immutability proof — introducing a new key changes nothing already issued

This section demonstrates, procedurally and by direct reference to the code that would run, that generating a new signing key today cannot alter the cryptographic identity of any certificate that already has a database row.

### 5.1 The mechanism that guarantees this

`functions/_lib/document-hash.js`:

```js
export function verifyDocumentHash(env, fields, storedFullHash, keyVersion = 1) {
  const version = Number(keyVersion) || 1;
  const key = verificationKey(env, version);   // ← looks up the key for the VERSION ON THE ROW
  ...
```

Every `stage_certificates` row stores its own `hash_key_version` (`NOT NULL DEFAULT 1` per `docs/certificate-key-deployment.md` §6). Verification **always** uses the key version recorded on that specific row — never "whatever key is current." This is not a policy that could be forgotten; it is the only code path that exists. There is no function anywhere in this codebase that verifies a row against `DOCUMENT_HASH_SECRET` (the current key) without first reading `row.hash_key_version` and dispatching to the matching key slot.

### 5.2 What changes and what does not, if `DOCUMENT_HASH_KEY_VERSION` becomes 3

| Row's stored `hash_key_version` | Key that verifies it, before v3 exists | Key that verifies it, after v3 is introduced | Changed? |
|---|---|---|---|
| `1` (the 7 IBT rows) | `DOCUMENT_HASH_SECRET_V1` | `DOCUMENT_HASH_SECRET_V1` — unchanged, this lookup does not consult the current version at all | **No** |
| `2` (the 6 IDD rows) | `DOCUMENT_HASH_SECRET_V2` (currently unset → `key_unavailable`) | `DOCUMENT_HASH_SECRET_V2` (still unset, unless separately recovered → still `key_unavailable`) | **No** — rotating the *current* version to 3 does not touch the v2 slot in either direction |
| `3` (any newly minted row) | N/A — no such row exists yet | `DOCUMENT_HASH_SECRET` (the new v3 value) | New rows only |

The proof is structural, not probabilistic: `verificationKey(env, version)` branches on `version === current ? env.DOCUMENT_HASH_SECRET : env[\`DOCUMENT_HASH_SECRET_V${version}\`]`. For a row with `hash_key_version = 1` or `2`, `version` is never equal to `current` (which would be `3`), so the function **always** takes the `env[DOCUMENT_HASH_SECRET_V<n>]` branch, regardless of what `DOCUMENT_HASH_SECRET` itself currently holds. Bumping the current version number is, by construction, a no-op for every already-signed row.

### 5.3 Explicit statement against each of the Founder's four required proofs

- **"Every existing v1 certificate continues to verify"** — proven in §5.1/§5.2 structurally, and confirmed live in §2.1: all 7 show `integrity: intact` right now, today, with v2 already long gone and no v3 yet introduced.
- **"Every existing v2 certificate continues to verify (if its public key is available)"** — the "if" is the honest caveat: v2's key is *not* available (§3), so these 6 show `pending_signature`, not `intact`, right now — and introducing v3 does not change that either way, per §5.2's table. It also does not make it *worse*: they are not at risk of moving to `integrity_check_failed` (a false-forgery signal) because of a v3 rotation, since `key_unavailable` is treated as a distinct case from `mismatch` throughout the verification code (`document-hash.js`'s `reason` field, and `verify.js`'s `stageCertificateState` in current `main`).
- **"No certificate previously issued changes hash, signature, or verification outcome"** — a row's `content_hash` is a stored column, written once at insert time; nothing about editing `DOCUMENT_HASH_KEY_VERSION` touches existing rows' columns. No `UPDATE` statement against `stage_certificates` is implied or required by a key rotation anywhere in this codebase.
- **"Only certificates that have never previously existed as signed institutional documents would receive v3 signatures"** — true by construction only if the minting step is run exclusively against genuinely new rows. This audit does **not** authorise that step (see §8) — it proves only that *if* it were run, it could not retroactively alter §2.1's 13.

---

## 6. Verification against institutional policy

| Governing document | What it requires | Does the "generate v3 now and mint" path (not yet taken) comply? |
|---|---|---|
| `docs/certificate-key-deployment.md` §4, "Rotating again, later" | Generate a new key → set `DOCUMENT_HASH_SECRET`, bump version → move the *old* key to `DOCUMENT_HASH_SECRET_V<old>` and keep it forever → add it to `RETIRED_KEYS` | **Partially blocked**: step 2 ("move the old key to the versioned slot") is impossible for v2, because the old key's value is genuinely lost (§3) — there is nothing to move. The policy was written assuming a rotation always has the outgoing key in hand; this is the first rotation where that is not true. This is a real gap between the written policy and the actual situation, not a violation caused by any action taken here. |
| `docs/certificate-key-deployment.md` §3, "Custody" | Two copies of any new key: one in Cloudflare, one in the school's most sensitive-document custody | Not yet actioned — the Founder explicitly paused key generation pending a storage decision, in this same conversation. Fully complied with by waiting. |
| `docs/graduation-registers/reissue-plan-2026.json` | A Founder-ratified plan for 6 KEEP / 4 REISSUE / 3 REVOKE against the original 13, plus 38 new mints | **Not executed** against the live database (§2.1). The Founder separately said this needs Registrar review before execution. Nothing in this audit executes any part of it. |
| Standing engagement rule (this conversation) | Never fabricate a signing key; never fabricate certificate data; never re-mint or renumber without explicit authorisation | Fully complied with — this document generates nothing, mints nothing, and its every factual claim is sourced above. |

**Conflict identified:** the deployment doc's own rotation procedure (§4 above) implicitly assumes the outgoing key is always recoverable at rotation time. That assumption is false for v2. This is worth the Founder's and Registrar's attention as a policy gap for future rotations, independent of what is decided about the current 31.

---

## 7. Risk assessment — if v3 is generated and used to sign the 31 (not yet done)

| Category | Risk | Mitigation already proven above |
|---|---|---|
| **Cryptographic risk to the existing 13** | None demonstrated — §5 is a structural proof, not a probabilistic estimate | N/A — risk is zero by construction, not "low" |
| **Institutional/physical-document risk** | **This is the real risk, and it is not small.** If any of the 31 already exist as printed documents with numbers/suffixes typed or generated outside this system's real signing pipeline (as appears to be the case for at least JSS-000048, per §4.7), then minting "fresh" official records under v3 could assign each student a *different* serial and suffix than what is already printed and possibly already scanned/shared. A parent's physical paper could then permanently disagree with the database, even though the database is "correctly" signed. | Not yet mitigated — this is exactly why §8 does not recommend proceeding to mint without first learning what is actually printed on the physical documents, if any exist. |
| **Audit implications** | A rotation to v3 is itself an auditable, logged event (this document, plus the code changes it would require) — not silent. | Full paper trail, as demonstrated by this very audit's existence. |
| **Legal/institutional-trust implications** | Two failure directions exist and must be weighed, not just one: (a) issuing verifiable v3 certificates whose numbers don't match what's physically in hand — undermines trust in the *verification system*; (b) continuing indefinitely with 31 unrecorded awards that cannot be verified by anyone, including the family's own bank, employer, or another school checking the credential — undermines trust in the *credentials themselves*. Neither is cost-free. | Addressed by requiring the institutional-issuance question (§4.7) be answered before choosing between them — see §8. |
| **Operational/maintenance implications** | A v3 key must be stored durably this time — the Founder's pause on key generation (this conversation) is itself the correct operational response to the v2 custody failure. | Already being handled correctly by the Founder's own caution. |

---

## 8. Final recommendation

Given the evidence above, the single blocking question is not cryptographic (§5 closes that question completely) — it is: **what is physically printed on any of the 31 documents that may already exist, if any do?**

Recommending **B** (generate v3 and mint) outright, before that is known, risks exactly the harm §7 identifies: assigning official numbers that may not match what a family is already holding. Recommending **A** (no action) leaves 31 real children's awards permanently unverifiable, which the Founder has already said is unacceptable. The evidence supports neither extreme cleanly. The recommendation is:

### Recommended path: **D, gated by a fact-finding step that only the Registrar can complete — not C**

1. **First (no code, no key, this is a paperwork/Registrar step):** For each of the 31, determine — from the Registrar's Office, from the physical documents themselves, or both — whether a certificate has actually been printed and given to a student, and if so, exactly what serial number, suffix, and QR payload (if any) is printed on it. This is the fact §4.7 identified as outside this audit's reach. It is the only missing input.
2. **For any of the 31 confirmed to have a real, already-distributed physical document with a specific printed number:** a **formal institutional reissue process** (option D) — the same honest, no-fabrication path already used for the original 13's `key_unavailable` handling — is the right tool, *not* a fresh v3 mint under a new sequence number. Concretely, this could mean: recording that exact printed serial and suffix into the database as-is (verifiable at least by record-match even if the suffix cannot be cryptographically re-derived without knowing what key, if any, produced it), or, if the Registrar determines the physical document's number should not stand (e.g. it doesn't match the canonical roll), a documented reissue under a new number with the old one explicitly voided — mirroring exactly the REISSUE/REVOKE pattern the Founder already ratified for the original 13's 4+3.
3. **For any of the 31 confirmed to have never been printed or distributed to anyone:** **B is appropriate for those specific ones only** — generate v3 (once the Founder has decided on safe custody), and mint them fresh under the Registrar's roll data already sitting in `reissue-plan-2026.json`, exactly as §5 proves is safe to do without touching the existing 13.
4. **C (recover another key) is not viable** for v2 specifically — §3's custody documentation is explicit that no second copy was ever confirmed to exist, and a 64-byte CSPRNG value has no structure to reconstruct. It remains viable in the general sense that a v3 key, once generated, must never be allowed to become similarly unrecoverable — hence the Founder's pause on generation until storage is settled is the correct precaution, not overcaution.

**In short: the 31 are not one population needing one answer. They may be two populations — already-printed and never-printed — mixed together, and only the Registrar's records or the physical documents can separate them. Steps 2 and 3 above are the correct action for each population respectively; applying step 3 to all 31 without first doing step 1 is the exact error this audit was commissioned to prevent.**

No key has been generated. No certificate has been minted. No record has been changed. This document recommends what to ask the Registrar next, not what to run next.
