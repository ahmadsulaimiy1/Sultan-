# Certificate revocations

**Register of certificates that were minted and must not stand.**

A stage certificate cannot be corrected in place. Its printed number is the head
of an HMAC over its own fields — the child's name, the programme, the year, the
issue date — so changing any of those changes the number engraved on the sheet.
The only correct remedy is therefore **revoke and reissue**, never amend.

This register records each revocation, why it was ordered, and what must replace
it. Executing a revocation is an act of the **Office of the Registrar** on the
live system; this file is the instruction and the audit trail, not the act.

Cross-referenced by `scripts/preflight-graduation-coverage.mjs`, which reports
each open entry on every run.

---

## R-2026-001 · Abdulbasit Adedokun · Ibtidā'iyyah

| | |
|---|---|
| **Certificate** | `SHRS-CERT-IBT-2026-000037-22C49` |
| **Document ID** | `DID-2026-IBT-0000037` |
| **Archive ref** | `ARCH/IBT/2026/000037` |
| **Student ID** | `711232557821021` — **permanent, and retained** |
| **Issued** | 8 August 2026, Ibtidā'iyyah batch 000035–000041 |
| **Key version** | 1 (retired). The batch is sealed; it can never be re-minted at this number. |
| **Status** | **REVOCATION ORDERED — NOT YET EXECUTED** |

### Why

The Founder's ruling of 8 August 2026:

> *"Those who show in Tamheediy shouldn't have the right to Ibtida'iyyah at all."*

The Registrar's Notice of the 2026 Combined Graduation Ceremony, 2 July 2026,
places Abdulbasit Adedokun under **Islamiyyah (Tamyidi)** — the preparatory
stage, confirmed on the same day to be a real award of this institution. On the
ruling, the two stages are mutually exclusive. His Ibtidā'iyyah certificate
therefore confers an award to which he is not entitled.

The certificate was minted before the two stages were distinguished in this
system at all: `TMH` did not exist in `functions/_lib/certificate-serial.js`
until 8 August. This is not an error of transcription — the roll it was minted
from was correct as the institution then understood its own stages.

### What must happen

1. **Revoke** `SHRS-CERT-IBT-2026-000037-22C49` on the live system. Public
   verification must then return *revoked*, never *genuine* — the standing rule
   that no unknown or withdrawn state may ever display as genuine applies here
   in its most literal form.
2. **Recover the printed sheet** if it has been handed over. It has not, as of
   this record: the ceremony is on 8 August 2026.
3. **Issue a Tamhīdiyyah certificate** in its place, at the current key version,
   **carrying the same permanent Student ID `711232557821021`.** He is one
   child and holds one number for life; only the award changes.
4. **Do not renumber the Ibtidā'iyyah batch.** 000037 stays consumed. The global
   sequence issues a number once, ever, and a revoked certificate has still been
   issued. The Ibtidā'iyyah register keeps all seven entries because it is the
   true record of what was minted on 8 August; the programme's Ibtidā'iyyah roll
   prints six, and states the departure in one line.

### Blocked on

The Tamhīdiyyah award cannot be issued yet. Its engraved English and Arabic
wording is provisional and unapproved, it has no roster, and it has no serial
range. If the sequence is extended, TMH continues after Qur'an College's 000074,
at **000075**.

### His Arabic name is not a blocker

**عبد الباسط أددوكن** was approved for the Ibtidā'iyyah batch and carries across
unchanged. Nothing new needs to be transliterated for him, and nothing will be.

---

## Open entries

| Ref | Certificate | Holder | Ordered | Executed |
|---|---|---|---|---|
| R-2026-001 | `SHRS-CERT-IBT-2026-000037-22C49` | Abdulbasit Adedokun | 8 Aug 2026 | — |

---

## Under consideration, not yet ordered

These are consequences of the ruling of 8 August 2026 that *"they are one"*, and
they turn on a question the Founder has not yet answered — **which spelling each
child's certificates should carry.** No revocation is ordered until he rules.

| Certificate | Engraved as | Also written as |
|---|---|---|
| `SHRS-CERT-IBT-2026-000038-2944F` | Naheemah Ismail | Naheemah Ismaeel · Naheemah Ismai Seriki |
| `SHRS-CERT-IBT-2026-000039-518A8` | Ashrof Akorede | Ashrof Ojewumi · Ashraf Korede Ojewumi |

If he rules that either sheet carries the wrong name, it becomes a revocation on
the same terms as R-2026-001: revoke, reissue at the current key version, retain
the permanent Student ID. Both are in the sealed key-version-1 batch, so neither
can be re-minted at its existing number under any circumstances.
