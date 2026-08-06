# CERTIFICATE MASTER FREEZE DECLARATION

**Sultan Hanafi Royal Schools — Official I'dadiyyah Certificate System**
**Production Release v1.0 Master Locked**

*This document is the baseline. `scripts/verify-certificate-master.mjs` parses the manifest in §2 out of this file and enforces it — the hashes published here are the hashes that run. It is a record of what was frozen and what a freeze can and cannot promise; it carries no authority over whether the certificates themselves are correct, which is the business of the other `verify-*` gates.*

---

## 0. Why this exists

Six real certificates are in issue — 000042 through 000047, I'dadiyyah, session 2025/2026. Every gate this repository had before today answers the same question in different ways: *is this batch correct?* `verify-certificate-batch.mjs` re-derives the serials and recomputes the hashes; `verify-certificate-plate.mjs` re-measures the plate; `verify-certificate-ground.mjs` re-checks every paint and stroke; `verify-certificate-layout.mjs` re-measures the sheet.

Not one of them can answer *is this the same master?* — because each of them consults the current source to decide what "correct" means. Change the display face, move the seal 3mm, re-cut a crest at a different resolution, and every one of those gates still passes. The sheet is internally consistent. It is simply no longer the sheet Muhammad Ismail Seriki was handed.

That gap is what this freeze closes, and only that gap.

## 1. How the frozen set was determined

By tracing, not by being handed a list.

The trace starts at `functions/_lib/stage-certificate-template.js` — the module that emits the sheet — and follows every relative import transitively, then collects every `/assets/…` path any visited source references, whether in an `@font-face` `src`, an `<img src>`, or an SVG `<image href>`. Three further entry points are named explicitly because an import walk cannot reach them:

- **`certificate-ground.js` and `certificate-plate.js`** — nothing imports them at render time. They are the vector authority: `certificate-plate.js` holds the `PAPER` constant the supplied artwork's marks layer was *solved against* (`out = PAPER*(1-a) + C*a`, reconstruction error 0.35 of 255). A file that governs the sheet without being imported by it is exactly the file a naive dependency walk misses.
- **`qrcode.js`** — the QR is printed security furniture, but the dependency edge runs through the *caller* (`functions/api/portal/staff/registrar/stage-certificates.js` and `scripts/issue-certificate-batch.mjs` both build the QR and pass the markup in), not through the template.

The gate re-runs that same derivation on every invocation and warns about anything on the path the manifest does not know about. That is the part that survives a future edit: a font added to the sheet in six months announces itself.

### 1.1 Network fetches at render time — checked, and the finding

**The sheet fetches nothing from a host outside this repository.** This was checked three ways and the answer was the same each time:

1. Every one of the fourteen faces is self-hosted under `assets/fonts/` with an `@font-face` `src` pointing at a root-relative path. There is no `fonts.googleapis.com`, no `fonts.gstatic.com`, no CDN `<link>` or `<script>` anywhere on the path.
2. The only absolute URLs in any frozen source are `http://www.w3.org/2000/svg` and `http://www.w3.org/1999/xlink` — XML namespace *identifiers*. SVG will not parse without them and nothing is ever fetched from them.
3. Confirmed against a rendered artefact rather than the source alone: the issued sheet for 000042 contains those two namespace strings and eight `/assets/…` references, and no other URL of any kind.

The gate keeps it that way — any absolute URL on the render path outside that two-item namespace allowlist is a hard failure, not a warning. A network-fetched webfont is not frozen by freezing this repository, and it is the single most likely way this certificate's typography silently changes years from now without one line of the repository changing.

**Two honest qualifications**, because "no network fetch" would otherwise be overstated:

- The `/assets/…` paths *are* fetched over HTTP by the rendering browser — from whatever origin the sheet is served from. What renders is the deployed origin's copy of those files, not this repository's. The manifest freezes the repository; a deploy that ships a different `assets/` tree renders a different certificate and this gate will not see it. Run the gate against the tree that is actually deployed.
- `--ar-label:'Reem Kufi',sans-serif` is declared in the sheet's `:root` block. **Reem Kufi is not self-hosted and has no `@font-face`.** Today this is harmless: `var(--ar-label)` has no consumers — the variable is declared and never used, so nothing renders in it. But the day someone reaches for it, that text will set in the rendering machine's default sans-serif and nothing in this repository will have changed. Either self-host the face or delete the variable; do not leave it as a loaded trap.

## 2. The frozen set

Thirty-one files. The block below is authoritative and machine-read; the notes after it are commentary.

<!-- MANIFEST:BEGIN -->
```text
ed37114bd8fd6b11ead7844e98a71a844f9fb0af96626dfec062c9eeb3331a91  functions/_lib/stage-certificate-template.js
3717f739187b71e51a5c58f047968a8c16ea0e1ec6fd0d3144b00d2e5fa7f436  functions/_lib/certificate-serial.js
28aeab43bc80c6944420ea5604d1daed65136b2563424cb3a0d82e09c564266d  functions/_lib/certificate-ground.js
be561a9a81c6f9e0c71494b34763fee8934f007294514b21e8939672385bdefa  functions/_lib/certificate-plate.js
0accae1da5b493cc2247b5b7ba6f3aaab6838fc3f3e96528057ee3a4eb3681f5  functions/_lib/identity-no.js
511186442a0401b192452d10f37d846ef2710c4adea5ba78ac24dc8bb9c333ed  functions/_lib/document-hash.js
915b002431849838a0bbb9f072e622c0d398f7b38034193e1dba913a10444a60  functions/_lib/qrcode.js
3fb974774b583fbf047a49ca0055e012872e3ccd2574bf8cf6fefa8b542e38ad  assets/images/certificates/official-background-idd-marks.png
d8101284288f4966ef1ae4ebfce6aaef34da4d9d9199e1a448a12c66717925a7  assets/images/certificates/official-background-master.jpg
da3f8002b345dadd4d6291bb71dac0fe204742636c179c8691b090c6e76b3856  assets/images/certificates/official-seal.png
f515251619096cffa520ca394cdee3b6da2ceb088396961b96dbc217dd78e281  assets/images/certificates/security-emblem-shrs.png
98fa380e537ab817a8d7dcee40a97995a5af24756b591774cb9ead02061d2a68  assets/images/certificates/signature-principal.png
42f72ab53f169969f36a4daf7f12a28cdcca8234249daf4a43b981e817776e1b  assets/images/certificates/signature-chairman.png
36071180aa3ea45d0dc65e45812a331941a9e71fd80a34b326a29c98eebbfdd5  assets/images/crests/shrs-institutional-crest.png
41a6bae280e99a6c9658119bf4d1b5c037614cf717a2e1199261deaaf2933c0c  assets/images/crests/nigeria-coat-of-arms.png
26e2bbef686cd317191c577cb775eaf99380eb7c233b2d4338a8fa41ac96510e  assets/images/crests/lagos-state-arms.png
e55cd966387f76b53c0513a0afd98bb8d7764f06583779690cf13a38f39c5064  assets/images/crest-watermark.png
9abf8a10b4a2f27b698740522c9beec9ded7728aeef0738ac0d6e175bf6249d7  assets/fonts/amiri-arabic-400-normal.woff2
c775d9f8c3a7cf0d0c2bb5246dd699e8c09bf6f8758e1be0b98939331b18bcce  assets/fonts/amiri-arabic-700-normal.woff2
d600850a2b0f3d862559d0bb040bca877e0f75cf9ee71a893bbd5089a224e3cd  assets/fonts/amiri-latin-400-normal.woff2
f53eb332acb23ec7e09e2487909c56cf841d649c970084d6a74d82aa9534f737  assets/fonts/amiri-latin-700-normal.woff2
b873cdd90d6bd9ca4793c805b4175abfae00b3611ee8afccf63067133dcf1217  assets/fonts/cinzel-latin-400-normal.woff2
8efa224fe70fef188a39c095e218b81fd31061809f2752537e33a9ec7b9c2263  assets/fonts/cinzel-latin-700-normal.woff2
47fd3e35a90ae2198df04cdc9f036011f1b58f6e97878de7aa9258c35f6ac665  assets/fonts/cinzel-latin-800-normal.woff2
8197bf53615ddc8c423f444c7f0eec63b7fa0ba093fcfbec60dfdd28429b0fc8  assets/fonts/cormorant-garamond-latin-500-normal.woff2
4fb55a7a6d564d428061fe12c82c896264bcc8b7f0b52840bf88e0db5b91256f  assets/fonts/cormorant-garamond-latin-500-italic.woff2
ae062b6d5ae308e7edf61b28b07b9984bbb6e961b1f34d9b2c2f4389c33f21ea  assets/fonts/cormorant-garamond-latin-600-normal.woff2
0b6719b25266b8f7f0b48e84eb8094db8d243c5b089a5fa48d350bc93f57127b  assets/fonts/cormorant-garamond-latin-600-italic.woff2
21a0fc1c5c22708cf4aa0c147fd32982e25bf9e21efec0ca31a4495ba41753eb  assets/fonts/cormorant-garamond-latin-700-normal.woff2
8909904ab6c872eb994093482a88a28eca2cd95912d7b6fecd72103b0dc07edc  assets/fonts/inter-latin-400-normal.woff2
f9a06e79cd3a2a20951c0f0e28f66dd0e6d3fda73911d640a2125c8fcb78f21a  assets/fonts/inter-latin-600-normal.woff2
```
<!-- MANIFEST:END -->

**Source (7).** `stage-certificate-template.js` emits the sheet. `certificate-serial.js` is the numbering and hash authority, and reaches `document-hash.js` (the HMAC) and `identity-no.js` (the 15-digit Student ID) through its own imports. `certificate-ground.js` and `certificate-plate.js` are the vector authority described in §1. `qrcode.js` renders the printed QR.

**Artwork (10).** Live on the I'dadiyyah sheet: `official-background-idd-marks.png` (1080×762 RGBA, the marks layer — 92 DPI, stated plainly, and the one thing a higher-resolution source would fix outright), the three header emblems (`shrs-institutional-crest.png` 520×476, `nigeria-coat-of-arms.png` 492×439, `lagos-state-arms.png` 223×239), `official-seal.png` (1034×1015), `security-emblem-shrs.png` (170×186), and the two signature inks (`signature-principal.png` 2336×753, `signature-chairman.png` 391×243).

Two artwork files — `official-background-master.jpg` and `crest-watermark.png` — are frozen but do **not** print on the I'dadiyyah sheet. They are reached only through `sheetHtmlConstructed`, the fallback branch taken when `OFFICIAL_BACKGROUND` is null, which it is not. They are in the set deliberately: they are referenced by a frozen source, so a change to them is a change to what the master *would* render, and a silent drift there would surface only at the moment the fallback is next needed.

**Fonts (14).** All self-hosted, all subsetted `.woff2`: Amiri (Arabic 400/700, Latin 400/700), Cinzel (400/700/800), Cormorant Garamond (500, 500 italic, 600, 600 italic, 700), Inter (400/600). Every one is referenced by an `@font-face` in the sheet's own `<style>` block, and every `@font-face` in that block resolves to one of these files.

### 2.1 Baseline provenance, stated honestly

These hashes were taken from the **working tree**, not from a clean commit. At the time of the freeze pass, `HEAD` was `54cb3bf30002ca9fbde08fa88d7c0775998ed877` ("Record the Founder's approval of the six Arabic spellings") and one file in the frozen set — `functions/_lib/certificate-serial.js` — carried uncommitted acceptance-audit work (+179/−24).

So: **this manifest is a working baseline, not the signed v1.0 baseline.** When the acceptance work lands and v1.0 is tagged, re-run the hashes and amend §2 in the same commit that tags the release. Publishing a baseline that was never a commit and calling it "Locked" would be the wrong kind of tidy.

#### Amendments to this baseline

Every movement of a hash in §2 is recorded here with its reason. The gate has
no `--update` flag precisely so that this list cannot be skipped: re-baselining
is an editorial act with a justification, not a command you run.

| Date | File | From → To | Why |
|---|---|---|---|
| 2026-08-06 | `functions/_lib/stage-certificate-template.js` | `ed3261ce…d933f0` → `ed37114b…331a91` | **A4 correction, authorised by the Founder in the Final Acceptance Review.** The sheet was 209.5mm tall against a 209.89mm A4 page, leaving a 0.34mm strip of bare paper across the full 297mm foot — measured off the press PDF at 300 DPI, abutting near-black at the left and crimson at the right. `frameSvg`'s `H` and `.sheet{height}` move to a true 210. This also ends a split coordinate system: `certificate-ground.js` and `certificate-plate.js` have always drawn on `h=210`, so those layers were being squashed 0.24% into a 209.5mm box while the frame alone was not. Every element is positioned in mm from the top, so nothing moves. |

| 2026-08-06 | `functions/_lib/document-hash.js`, `functions/_lib/certificate-serial.js` | signing → key-versioned signing | **Key versioning, mandated by the Founder's Final Production Release Directive.** A certificate is permanent, so rotating `DOCUMENT_HASH_SECRET` with no version recorded would make every previously issued certificate report `integrity_check_failed` — the system publicly branding genuine documents as forgeries. Each row now records `hash_key_version` and verifies under the key that signed it. Version 1 (the committed development literal) is RETIRED: it may verify forever, and signing with it now throws. |

The Editorial Bible §4.1 records "A4 landscape (297 × 209.5 mm)". That line is
wrong about A4 and is where the half-millimetre originated; it should be
corrected to 297 × 210 mm when the Bible is next revised.

## 3. What is deliberately excluded, and why

| Excluded | Why |
| --- | --- |
| **Student data** — `docs/graduation-registers/*.json`, `*.sql` | These carry named students, their Student IDs, and their `gradeEn`/`gradeAr`. They change every cohort; freezing them would make the ordinary act of graduating a class look like tampering. They are also the one place grades legitimately live, which is a reason to keep them out of a design manifest, not in it. |
| **Sequence counters** — `stage_certificate_serial_seq`, `student_identity_seq`, `guardian_identity_seq`, `staff_identity_seq` (Postgres) | They are not files. They are atomic database sequences whose whole job is to advance, exactly once, per issued document. A frozen counter is a broken counter. |
| **Register outputs** — the generated `.sql` import files and their JSON registers | Derived artefacts of an issuance run. Their correctness is `verify-register-import.mjs`'s question, and it is a different question: *does this register reproduce the hashes it claims?* |
| **`dist/certificates/**`** | Rendered output, git-ignored, regenerated by `issue-certificate-batch.mjs`. Freezing a render freezes a symptom. If the master is intact and the data is intact, the render follows. |
| **`build/certificate-ground/`, `build/certificate-plate/`** | Proof rasters (31MB at 600 DPI), git-ignored, regenerated on demand by the `--render` flag on their gates. |
| **Callers** — `functions/api/portal/staff/registrar/stage-certificates.js`, `scripts/issue-certificate-batch.mjs` | Issuance policy, not the master: roster handling, permissions, audit, database writes. They are under continuing change by design. But see §4.4 — they carry constants that *do* reach the printed sheet, and that is where this boundary is thinnest. |
| **`node_modules/`, `package-lock.json`** | Not frozen by hash here; see §4.3. |

## 4. What the manifest cannot cover

A file manifest freezes files. These four inputs decide what the certificate looks like or what its hash is, and none of them is a file in this repository.

### 4.1 `DOCUMENT_HASH_SECRET` — custody

The content hash on every certificate is `HMAC-SHA256(DOCUMENT_HASH_SECRET, canonical-field-JSON)`. It is the value that makes `a775e194…` mean something. It is **not** in this manifest, must never be in this repository, and is not something a hash of files can protect.

Its custody status, recorded plainly because it is the most consequential non-file input in the system:

- The six issued certificates (000042–000047) were hashed with `DOCUMENT_HASH_SECRET` resolving to the literal `batch-issuance-development-secret`, via a fallback that used to sit at `scripts/issue-certificate-batch.mjs:355`. Recomputation reproduces the published `a775e194852776ac1d95f62ecca406f0b5e8987aa9ab1cd037c2e50ca82bf730` for Muhammad Ismail Seriki exactly, and both the engraved suffix `A775E` and the printed code `A775-E194-8527` derive from it.
- The fallback is gone. `issue-certificate-batch.mjs` now refuses to issue when the variable is unset, and `document-hash.js` has always thrown rather than hash with an empty key.
- **Whether to re-mint the six under a real, custodied secret is the Founder's decision.** It is not made here and was not made by this work. Nothing in this freeze re-mints, regenerates or alters an issued number.
- Whatever is decided: the secret must live only as a Cloudflare environment variable, with the same custody discipline as `SESSION_SECRET`, and the decision itself must be recorded. A secret nobody can produce on demand is a verification system that will one day fail closed on a genuine certificate.

### 4.2 The Chromium build

The certificate is HTML. What turns it into ink is a browser, and the browser is not in this repository.

- **Locally**, the render/proof gates launch `playwright-core` 1.62.1 against `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` — **Chromium 141.0.7390.37**. That is the binary the plate proofs and layout measurements in this repository were taken with.
- **In production**, `functions/_lib/pdf-render.js` renders through the Cloudflare Browser Rendering binding (`env.BROWSER`). Cloudflare chooses that Chromium and updates it on their schedule. **This repository cannot pin it and does not pretend to.**
- Consequences that are real, not theoretical: font shaping and hinting, sub-pixel text metrics, `filter:` rasterisation, and — most sharply here — the resolution of any bare `serif` / `sans-serif` fallback all belong to the rendering build. The sheet's own `--en-text` chain ends `'Cormorant Garamond', Garamond, serif`; if the self-hosted face ever fails to load, what appears is the *rendering machine's* idea of a serif.
- The mitigation available is the one already taken: self-host every face, set `font-display:block` so a slow font blocks rather than flashes a fallback, and keep the bare-family fallbacks unreachable in practice. Record the rendering build alongside any future press proof, so a proof can be reproduced.

### 4.3 npm dependencies

`qrcode@^1.5.4` generates the printed QR symbol; `@cloudflare/puppeteer@^1.2.0` drives production rendering. Both are caret ranges. `package-lock.json` pins the resolved versions but is not in this manifest, because it is shared with the whole site build and churns for reasons that have nothing to do with certificates. A `qrcode` minor release that changed module placement would change the printed symbol without touching one frozen file. If that matters more than the churn does, add `package-lock.json` to §2 — the gate needs no change to enforce it.

### 4.4 Constants that live in more than one file

This is where master integrity stops being file-granular. Every entry below is a value that appears independently in two or more places; freezing all of them still permits them to disagree, because a manifest checks each file against its own past, never against its neighbour.

**The paper colour `#F4ECDF`** — searched for exhaustively, in hex and in channel form:

| File | Form | Note |
| --- | --- | --- |
| `functions/_lib/certificate-plate.js:69` | `export const PAPER = '#F4ECDF'` | **The authority.** The marks layer was solved against exactly this value; the file says so in its own header — *"CHANGING `PAPER` INVALIDATES THE MARKS LAYER."* |
| `functions/_lib/stage-certificate-template.js:385` | `paper: '#F4ECDF'` | **What actually prints.** A hand-copied duplicate of the authority, not an import. The largest area of the sheet is painted from this literal. |
| `scripts/verify-plate-single-seal.py:28` | `PAPER = (0xF4, 0xEC, 0xDF)` | A gate's own third copy. If the authority moved and this did not, the gate would validate the plate against a paper the plate is no longer printed on. |
| `functions/_lib/certificate-ground.js:61` | `const PAPER = [0xF4, 0xEC, 0xDC]` | **Divergent — `0xDC`, not `0xDF`.** One level of blue apart. |

The last row is the point of this section. `certificate-ground.js` premixes every pale tone against its own `PAPER` and emits flat hex, precisely so no hairline is ever screened; premixing against a paper one level off produces tints that are one level off. It does not reach the issued I'dadiyyah sheet today — nothing imports `certificateGroundSvg` except its own gate — so **no printed certificate is affected**. But it is the exact failure this section exists to name: four files, three agreeing, one quietly not, and every file-level gate in the repository green.

The right fix is not a bigger manifest. It is a single exported constant that the other three import — and `verify-certificate-plate.mjs` already shows the pattern by importing `PAPER` from `certificate-plate.js` rather than keeping a copy. That change is out of scope for a freeze (it would edit files this task does not own, and a freeze's first act should not be an edit) and is recorded here as the recommendation.

**Other cross-file constants, same class of risk:**

- `PT = 0.35278` (mm per point) in `certificate-ground.js:49`, `certificate-plate.js:60`, `stage-certificate-template.js:867`, `verify-certificate-ground.mjs:22`, `verify-certificate-plate.mjs:22` — five copies, all currently identical. A wrong one silently rescales microtext against the press floor it is checked against.
- QR parameters `{ errorCorrectionLevel: 'H', margin: 4 }` in `stage-certificates.js:156` and `:171` and `issue-certificate-batch.mjs:488` — three copies, and they sit in *excluded* files. The QR that prints is generated with these; drift between the endpoint and the batch script means the portal and the batch print physically different symbols at the same 17.2mm.
- The archive reference and document id shapes — `ARCH/<PROG>/<YYYY>/<id6>` and `DID-<YYYY>-<PROG>-<id7>` — are composed independently in `stage-certificate-template.js:1154,1241` (what is engraved) and `issue-certificate-batch.mjs:430–431` (what is recorded in the register). Divergence here produces a sheet whose printed archive reference does not match its own database row, and neither side would notice.

## 5. No version mark is printed on the certificate

**Deliberate, and worth stating so it is not later mistaken for an oversight.**

Marking the sheet "v1.0" would require adding an element to the artwork — a line of type, a mark in a corner, a change to the plate. That is an artwork change, and freezing the master and altering the master in the same act is incoherent. The version would then identify everything except the thing it was supposed to identify.

There is also nothing to gain. The sheet already carries per-document identity in five independent forms — the serial `SHRS-CERT-IDD-2026-000042-A775E`, the printed verification code `A775-E194-8527`, the document id `DID-2026-IDD-0000042`, the archive reference `ARCH/IDD/2026/000042`, and the Code 128-C barcode payload `2026000042` — plus the live serial in the microtext rails. Which master rendered a given sheet is answerable from the issuance record, which is where that question belongs.

If a future release genuinely changes the sheet's appearance, the honest signal is a new certificate design with its own recorded release, not a version number retrofitted onto this one.

## 6. What this freeze does and does not guarantee

**It guarantees**, for the tree it is run against:

- Every one of the 31 files is byte-identical to the manifest, or the gate names the ones that are not, with both hashes printed.
- No frozen file has been deleted.
- No absolute URL outside the two XML namespaces exists on the render path — the sheet does not reach a CDN or a webfont host.
- Anything newly on the derived render path that the manifest does not know about is reported (a warning by default; a failure under `--strict`, which is how CI should run it).

**It does not guarantee:**

- **That the rendered certificate is unchanged.** The renderer is not frozen (§4.2). Same bytes, different Chromium, different sheet is entirely possible.
- **That the deployed site serves these files.** The manifest freezes this repository; the browser fetches from an origin (§1.1).
- **That the constants agree with each other.** Every file can match its own hash while two of them contradict each other (§4.4) — and one pair currently does.
- **That the certificates are correct.** That is the other gates' job. A perfectly frozen master can carry a perfectly frozen mistake. This gate would report that as intact, and would be right to.
- **That an issued certificate can still be verified.** That depends on `DOCUMENT_HASH_SECRET` (§4.1), which is not a file.
- **That nobody changed anything.** It proves that if they did, this run says so. A freeze is a detector, not a lock; it has no opinion about the future and cannot prevent an edit. Its entire value is that drift stops being silent.

## 7. Running it

```
node scripts/verify-certificate-master.mjs            # human check of a working tree
node scripts/verify-certificate-master.mjs --strict   # CI: warnings become failures
```

Exit 0 and `Master intact — Production Release v1.0 Master Locked`, or exit 1 and an itemised list of what drifted, went missing, or appeared.

The gate checks the release identity in §0's header as an *adjacent pair of lines*, not as two substrings — because that sentence you just read quotes the second line, and an earlier draft of the gate passed a header edited from v1.0 to v1.1 for exactly that reason. Keep the two lines together at the top of this file.

The gate reads only. It cannot compute, assign, or alter a certificate number, a Student ID, or a content hash, and must never be given the ability to.

There is **no `--update` flag**, deliberately. A gate that can rewrite its own baseline is a gate that gets rewritten instead of investigated. Re-baselining is a hand edit to §2 of this document, reviewed like any other change to a signed record, in the same commit as whatever justified it — and never by editing a hash to match a file.

## 8. Untouched by this work

Recorded because a freeze that quietly altered what it froze would be worthless:

- The six certificates 000042–000047 — their serials, Student IDs, verification codes, archive references, document ids and content hashes — are unchanged. This work added two files (`scripts/verify-certificate-master.mjs` and this document) and modified none.
- No certificate was re-minted, no batch regenerated, no register rewritten.
- No Arabic name was generated, transliterated or guessed. The names in `docs/graduation-registers/2026-08-08-IDD-000042.json` remain exactly as the Founder approved them on 2026-08-06.
- The grade rule holds and was re-checked rather than assumed: `grade_en`/`grade_ar` are stored and hashed, never rendered (`stage-certificate-template.js` header, Editorial Bible §1.5), and `functions/api/certificates/verify.js` returns no grade field — confirmed by reading it, not by trusting the comment at its line 156.
