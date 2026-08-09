# Certificates that do not verify — what happened and how it is repaired

**Raised by the Founder, 9 August 2026:** *"All those certificates that were
issued are no longer verified on the portal once their numbers are clicked on
the verification bar. They don't show up anything. The certificates have been
awarded to the awardees."*

This is the written answer. It states what was found, what was proved, what
could not be proved from where the investigation ran, and the exact steps that
put it right.

---

## 1. What is actually wrong

**Minting a certificate and creating its record are two different acts, and
only the first one happened.**

The issuing scripts produce four things: the printable sheets, the register in
JSON, a human-readable register in Markdown, and an SQL file. The SQL file is
what creates the rows the public verifier reads. **Nothing in this repository
writes those rows to the live database** — that step is a human import, and it
was never run for the 8 August 2026 graduation.

So every artefact the school has looked at is correct. The sheets are correct,
the printed numbers are correct, the register is correct, the QR codes point at
the right addresses. The only place the omission shows is the one place the
school does not look: a graduand typing their own number into the public page
and being told there is nothing there.

That is why the site "looks downgraded" without any deployment having removed
anything. The verification page, the `/v/*` short link, the API route, the
number-parsing code and the page build were all checked and are all intact —
see §4. There is simply no record behind the numbers.

## 2. The repair — two imports, in this order

Both files are already in the repository, already generated, already correct.
They are imported into the **live** database (the Neon production branch that
Cloudflare Pages uses), by someone with database access.

```
1.  docs/graduation-registers/2026-08-08-IBT-000035.sql      (7 certificates)
2.  docs/graduation-registers/2026-08-08-IDD-000042.sql      (6 certificates)
```

**The order matters and is not interchangeable.** Each file ends by advancing
the numbering sequences past its own batch, with a plain `setval`. IBT sets
them to 41; IDD sets them to 47. Imported the wrong way round, the final state
is 41 — and the next certificate the Registrar issues is numbered 000042, which
is already on Yaseer Balogun's document. **IBT first, then IDD.**

Neither file is safe to run twice. The certificate rows carry explicit `id` and
`serial_no` values under unique constraints, so a second run fails loudly on a
duplicate rather than quietly doubling anything. If an import errors part-way,
stop and read the error — do not re-run to "make sure".

One thing to check while importing: the first block of each file attaches the
permanent Student ID to an existing student row, matched on `full_name`, and
only where no ID is set yet:

```sql
UPDATE students SET identity_no = '714743483445443'
  WHERE full_name = 'Hameedah Adebimpe Ojewumi' AND identity_no IS NULL;
```

If a graduand has no `students` row on the live database, or is filed there
under a different spelling, that `UPDATE` matches nothing and reports `UPDATE 0`.
The certificate still verifies — the certificate row carries the Student ID
itself — but the child's own record will not be linked to it. Note any `UPDATE 0`
lines and give them to the Registrar's Office to reconcile; do not edit the SQL.

## 3. Proving it, before anyone is told it is fixed

```
node scripts/verify-issued-certificates-live.mjs
```

This asks the **public** endpoint exactly what a holder asks it. For all
thirteen certificates it checks every number printed on the sheet — the full
serial, the engraved number with and without its check tail, the document id,
the archive reference, the verification code beside the QR, and the Student ID —
and passes a certificate only when all of them resolve to it. It sends nothing
but numbers already printed on documents in circulation, and it writes nothing.

A clean run ends:

```
PASSED — all 13 issued certificate(s) verify on every identifier they print.
```

Anything else is printed per certificate and per identifier, with the two
failures distinguished: a number the school does not issue, versus a number it
does issue and holds no record of. The second is the missing-import signature,
and the script says so.

Run it after every future issuance, and after any deployment that touches
verification. **A sheet that has not passed this check should not be handed to
anyone.** A holder whose number returns nothing has been given a document the
school itself cannot confirm.

## 4. What was ruled out, and how

These were each checked rather than assumed, because "the site was downgraded"
would be a very different repair from a missing import:

- **Number parsing and lookup.** All eleven identifier shapes were resolved
  against the real published serials with the database stubbed. Every one
  resolved. The verifier's code is not the fault.
- **The public page.** `verify-certificate/index.html` builds, and the
  verification script is injected sitewide by `scripts/build.js`.
- **The short link.** `_redirects` line 12 still carries
  `/v/*  /verify-certificate/?ref=:splat  301`, which is what every QR code on
  every sheet points at.
- **The API route.** `functions/api/certificates/verify.js` is in place at the
  path the page calls.
- **Where rows come from.** Grepped: nothing in the repository inserts into
  `stage_certificates` on the live database. The SQL import is the only path.

## 5. What could **not** be proved from here, stated plainly

The investigation ran in a sandbox whose outbound network access is filtered.
Requests to `shroyalschools.com` are refused by the proxy —
`HTTP 403 — Host not in allowlist` — which is the sandbox's own restriction and
not a fault on the site. **The live database was therefore never queried and
the live endpoint was never called from here.** The diagnosis above rests on
reading the code and on the fact that the import step has no record of having
been run.

The command in §3 is the thing that closes that gap, and it must be run from a
machine that can actually reach the site.

## 6. The second fault — what the verifier *said*

The missing import is the cause. But it exposed a real defect in what the page
told the holder, and that has been fixed in the same change.

The endpoint knew whether a reference was a shape this institution issues; it
already used that fact to decide whether to write an audit-log row. It then
discarded it, returning an identical "not found" for two completely different
statements:

- *this is not one of our numbers* — a typo, or someone else's document;
- *this **is** one of our numbers and we hold no record of it* — which is
  exactly what all thirteen awardees saw.

Answering the second with the first tells a graduand holding a genuine, signed
certificate, in public, that their document appears to be nothing. That is an
accusation, and the school never made it — the page did, on the school's behalf.

The two states are now distinct, in English and Arabic. Neither claims anything
about the document: `found` stays false, no status is asserted, and **no unknown
state ever displays as "Genuine."** The recognised state says plainly that this
is a statement about the school's records and not about the holder's
certificate, and directs them to the Registrar's Office.

It is also the institution's own alarm. A well-formed certificate number with no
row behind it means a record is missing or was never created. Nobody can act on
a warning that reads like a typo.

## 7. So this cannot happen again

Both issuing scripts now end on the step that is still outstanding, rather than
on "written to …". The last thing on the screen after any issuance names the
SQL file to import and the verification command to run, and says in terms that
the certificates do not verify yet.

That is deliberately the final output. The previous ending was a success
message, and a success message at the end of a run that has not finished is how
thirteen certificates reached thirteen children with nothing behind them.

---

**Still outstanding after the import** (tracked separately, not part of this
repair): Abdulbasit Adedokun's Tamhīdiyyah certificate is approved and awaiting
issuance through the Certificate Generation Centre; the revocation of
`SHRS-CERT-IBT-2026-000037-22C49` (R-2026-001) is deferred by the Founder's
instruction; and five Arabic names remain with the Founder.
