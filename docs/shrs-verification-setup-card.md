# The only thing that needs your hands

Everything else is automated. This is a five-minute job, done once, and then
the certificates verify and keep verifying.

You have to do this part yourself for one reason: **the production signing key
must never pass through me, through a chat window, or through this
repository.** That is not a limitation to work around — it is the thing that
keeps the key a key. Anything I can read, anyone reading this session can read.

---

## Paste four values into GitHub, once

Go to → **github.com/ahmadsulaimiy1/Sultan- → Settings → Secrets and variables
→ Actions → New repository secret**

Add these four. Names must match exactly.

| Name | Value | Where you already have it |
|---|---|---|
| `DATABASE_URL` | the Neon **production** connection string | Neon dashboard → your project → Connection string |
| `CLOUDFLARE_API_TOKEN` | a Cloudflare API token with *Pages: Edit* | Cloudflare → My Profile → API Tokens → Create |
| `CLOUDFLARE_ACCOUNT_ID` | your Cloudflare account ID | Cloudflare dashboard sidebar, or any project URL |
| `CLOUDFLARE_PAGES_PROJECT` | the Pages project name | Cloudflare → Workers & Pages → the project's name |
| `DOCUMENT_HASH_SECRET` | the production **v2** signing key | your secure store / the deployment file |

That is the whole job.

> **Do not paste any of these into this chat.** If you ever do by accident,
> rotate it immediately — treat it as published.

---

## Then click Run

**Actions → "Certificate Verification — recovery and standing watch" → Run
workflow.**

It will, by itself:

1. Set the three verification variables on Cloudflare production —
   `DOCUMENT_HASH_KEY_VERSION=2`, `DOCUMENT_HASH_SECRET`, and
   `DOCUMENT_HASH_SECRET_V1`. All three together, because setting only some of
   them makes the public page accuse genuine certificates of not matching
   their signature.
2. Rebuild the import from the sealed registers and run it against the live
   database. Safe to repeat — it is idempotent, and it aborts and rolls back
   if any record disagrees with the certificate it belongs to.
3. Ask the **live public endpoint** every number printed on all thirteen
   certificates, plus each QR payload.
4. Print the acceptance table on the run's summary page and go **green only if
   all thirteen verify**.

A green tick is the proof. Not my word — the live site's own answer.

---

## After that, you never touch it again

The same workflow runs **every Monday at 07:00 Lagos time**, by itself, and
tells you if verification ever breaks again — a key rotated out, a database
restored from an older snapshot, a deployment rolled back. You find out from a
red tick, not from a parent.

---

## You can run it right now with nothing configured

The acceptance check needs no secrets — it asks a public endpoint public
questions. So you can trigger the workflow before adding anything and get an
honest, dated, machine-made statement of what the live site currently says
about all thirteen certificates.

It will fail, and it should: today the records are not there. But the summary
will name exactly which stage failed for each certificate, which is a far
better starting point than my description of it.

---

## If a step goes wrong

The run summary says which stage failed and what it means:

- **NOT RESOLVED** — the record is missing. The import did not run, or
  `DATABASE_URL` is wrong.
- **NOT ATTESTED** — the record is correct and a signing key is missing from
  the deployment. The three Cloudflare variables are not all set.

If the Cloudflare step itself fails (token scope, project name), everything
else still runs, and you can set those three variables by hand in
**Cloudflare → your Pages project → Settings → Environment variables →
Production**. The values are listed in the run summary.

Full detail: `docs/shrs-certificate-verification-recovery-2026.md`.
