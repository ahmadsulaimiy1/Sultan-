# Offline Certificate Checking — Phase 6

**Status of the mechanism:** built and tested, 20/20 checks passing.
**Status of activation:** **NOT ACTIVE.** It requires one thing only the
Founder can supply — see §6. Until then every offline check refuses, which is
the correct behaviour and not a defect.
**Files:** `js/shrs-certificate-offline.js`,
`scripts/build-certificate-register.mjs`, `scripts/test-certificate-offline.mjs`.

---

## 1. Why offline verification is impossible, and what replaces it

A certificate's integrity is proved by an **HMAC-SHA256** over its fields, keyed
by `DOCUMENT_HASH_SECRET`. HMAC is **symmetric**: the key that verifies is the
key that signs. Putting it on a device to enable offline verification would
hand every holder the power to mint a certificate that verifies. That is not a
trade-off to weigh — it is the end of the verification system.

So offline checking does **not** verify integrity. It answers a strictly weaker
question, from a **register** the school signs with an **asymmetric** key whose
private half never leaves the server:

| | Question answered | Strongest wording |
|---|---|---|
| **Online** | Does the serial resolve **and** does its content hash match? | **Genuine** |
| **Offline** | Is this serial recorded as issued, and what is its status? | **Recorded as issued by the school** |

The Founder's standing rule — *no unknown state may ever display as "Genuine"*
— is honoured structurally, not by careful wording. **No path through
`js/shrs-certificate-offline.js` can return `genuine: true`.** The acceptance
run walks every state and asserts it.

## 2. The register

```
{ version, issuedAt, keyId, algorithm: "Ed25519",
  entries: [ { h: <sha256(serial) truncated>, s: "valid"|"revoked", d: "YYYY-MM-DD" } ],
  signature: <base64 Ed25519> }
```

**Serials are stored as digests, never in the clear.** The register has to be a
public file for an offline device to hold it, and a public file listing every
serial the school has issued is an enumeration list. A holder can still check
the serial in front of them, because they have it to hash. Asserted by the test.

**No content hash is published.** The register proves the school published the
list; it cannot prove a certificate's integrity, and it must never be able to.

## 3. Six refusals, each with its own sentence

| State | Means |
|---|---|
| `recorded` | in the register, valid — *not* "genuine" |
| `revoked` | in the register, withdrawn |
| `not-in-register` | **not** "forged" — the register may simply predate it |
| `register-stale` | older than the 24-hour revocation window; refuses to answer |
| `register-untrusted` | unsigned, wrongly signed, or naming an unpinned key |
| `register-absent` | nothing held on this device |

Every one has a written sentence in English and Arabic. The distinction between
*not in this register* and *forged* is the one that matters most: a certificate
issued this morning legitimately will not be in last night's register.

The 24-hour ceiling **is** the revocation window (`certificateManifestMaxAgeMs`).
A register signed before a withdrawal would still say "recorded", so past that
age it refuses rather than answering out of date.

## 4. Two defects the acceptance run found

**1. The signature covered almost nothing.** The first canonicalisation used
`JSON.stringify(value, keyArray)`. An array replacer is an **allowlist applied
recursively** — the top-level key names filtered `h`, `s` and `d` out of every
entry, so each serialised as `{}`. The signature therefore covered the
register's *shape* and almost none of its *content*: a revocation could have
been flipped back to valid on a device and still verified. Caught by the
"a revocation cannot be quietly reversed" check, which is in the suite
precisely because that is the attack that matters. Nothing signed by the broken
code ever shipped.

**2. The two implementations could have drifted apart silently.** The signer
runs in Node, the verifier in a browser. If their canonical forms differ by one
byte, every signature fails on a parent's phone with no visible cause. Both are
now pinned to one fixture string, checked in Node by `--selftest` and in the
browser by the acceptance run.

## 5. What the acceptance run proves

`npm run test:certificate-offline` — **20/20.** Real Chromium, real WebCrypto,
real Ed25519. Cross-implementation canonical form · no placeholder key ships ·
refusal with no pinned key · lookup, revocation, unknown serial · no serial in
the clear · spacing and case tolerated · an entry added after signing rejected ·
**a revocation flipped back rejected** · a register signed by another key
rejected · an unpinned keyId rejected · staleness · absence · **no path returns
genuine** · every state has readable English and Arabic.

The key pair in the test is generated inside the test and discarded. No
certificate was minted, re-minted, renumbered or touched; no production key was
created, used or written.

## 6. Activation — what the Founder must do

**One command, once, on a trusted machine:**

```
openssl genpkey -algorithm ed25519 -outform DER -out shrs-cert-register.key.der
base64 -w0 shrs-cert-register.key.der
```

Then:

1. Store that base64 string as the GitHub Actions secret
   `CERT_REGISTER_PRIVATE_KEY`. **Never** commit it, paste it into chat, or
   print it in a log. Keep two secure backups before deleting the local file.
2. Run `npm run certificates:register` in CI. It prints the **public** key.
3. Paste that public key into `TRUSTED_KEYS` in
   `js/shrs-certificate-offline.js` as `'shrs-cert-v1'`, and deploy.

`TRUSTED_KEYS` ships **deliberately empty**. A placeholder would be worse than
nothing: it would make an unsigned register look checked.

**This phase also depends on the certificate records existing in production.**
They do not yet — the certificate schema has never been applied to the live
database, and the recovery workflow that applies it and imports the thirteen
issued certificates is still waiting on the five GitHub secrets. The register
builder refuses to publish an empty register, because every device would read
that as "no certificate is recorded". So the order is: run the recovery
workflow first, then activate this.

## 7. Standing constraints honoured

- `DOCUMENT_HASH_SECRET` is not exposed, referenced, or weakened.
- No certificate re-minted, renumbered, modified or replaced.
- No production key generated, used or printed by any script here.
- No unknown state can display as "Genuine" — structurally, not by wording.
- Every refusal fails closed.
