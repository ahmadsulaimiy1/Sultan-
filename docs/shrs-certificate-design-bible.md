# Sultan Hanafi Royal Schools — Certificate & Academic Documents Design Bible

**Phase 2 of the Final Executive Creative Direction. Status: design authority, not yet implementation. No document type may be built against this Bible until one of the ten concept directions (companion deliverable, presented separately) is selected by the Board.**

> This is a working master document, not a page-count exercise. It is written to be complete and decision-ready rather than padded to a literal page target — every section below is something an engineer or a print vendor could build from without guessing. If the Board wants this typeset and bound as a physical 100+ page publication for governance archives, that is a real, separate follow-on deliverable (a paginated PDF/print layout), distinct from this reference document.

---

## 1. Design Philosophy

A Sultan Hanafi Royal Schools academic document exists to do three things, in this order: **assert**, **prove**, **endure**.

- **Assert** — the instant a human looks at it, before reading a word, it must communicate "this was issued by a serious institution." This is achieved almost entirely below the level of conscious reading: weight of paper, restraint of colour, generosity of margin, the confidence of the type.
- **Prove** — it must survive scrutiny from an adversarial or simply careful reader: an immigration officer, a foreign registrar, an employer's HR department. This is the security architecture (§10 onward), and it must never feel bolted on.
- **Endure** — it must look correct in 2026 and still look correct, not dated, in 2076. This rules out anything trend-driven — no gradient, no "modern flat" iconography, no typeface chosen because it is currently fashionable in tech branding.

The philosophy is not "make it beautiful." It is: **would this still communicate authority if the reader had never heard of Sultan Hanafi Royal Schools and had no cultural context for Islamic ornament, Nigerian institutions, or royal styling at all?** A document that only works for an audience already primed to trust it has not actually solved the design problem.

## 2. Institutional Identity

SHRS is not a blank canvas — three real, non-negotiable facts already constrain every direction below:

1. **A real crest exists** (`assets/images/crests/shrs-institutional-crest.png`, extracted from the client's own currently-issued documents per the standing privacy/provenance discipline): a quartered shield — crescent-and-star, a book, three stars, a tree — bearing a laurel wreath and the institution's name banner. Any design direction must be able to *host* this crest with dignity; no direction may require redesigning the crest itself, which is the client's real, existing mark.
2. **The institution is genuinely bilingual and bicultural**, not "Western school with an Arabic translation bolted on" nor "Islamic school with an English translation bolted on." Four constituent schools — Nursery and Primary, Royal College, School of Islamic and Arabic Studies, Qur'an College — span a hybrid secular/Islamic curriculum. The design system must hold both halves of that identity with equal seriousness, per the Research Report's §3 finding on language order as a sovereignty statement.
3. **The institution operates under Nigerian state authority.** The Federal Republic of Nigeria's coat of arms already appears in the current masthead (§ Design System v2.1) as the country's public national emblem — a real, legitimate design element any surviving direction should be able to accommodate, not discard.

## 3. Emotional Objectives

Ranked, because a document cannot optimise for all of these equally:

1. **Gravity** — the primary feeling. Before pride, before warmth, the holder and any third-party reader should feel this document was not easy to obtain and is not easy to fake.
2. **Belonging** — a graduate should feel this document is unmistakably *theirs*, from an institution with its own real character, not a generic template with their name typed into a blank.
3. **Confidence-on-behalf-of-the-reader** — a third party (registrar, employer, embassy) should feel confident acting on this document without needing to phone the school to ask "is this real?" — though the verification platform exists for exactly that call, the document's own bearing should make the call feel unnecessary in the first place.
4. **Warmth, last and least** — SHRS is a real school educating real children, and a document that is *only* cold and institutional misses that this is also someone's proudest possession. Warmth should live in small, human details (a real signature, a real seal, a real name set with care) — never in the overall register, which stays formal throughout.

## 4. Visual Hierarchy — "inevitable," not merely "clear"

A hierarchy is *clear* if a reader can figure it out. It is *inevitable* if a reader never has to. The target order, top to bottom in perceived importance, regardless of which concept direction is chosen:

1. **The issuing authority** (national emblem + institutional crest, and the institution's name) — always first, always largest single typographic mass on the page after the recipient's name itself.
2. **The document's own nature** (Graduation Certificate / Academic Transcript / etc.) — must be unambiguous within one second, without requiring the reader to parse body text.
3. **The recipient's name** — the one true hero element; everything else on the page should visually defer to it without being smaller in *authority* (see the Research Report's §1 collegiate principle: the crest outranks the name, but the name is still the largest single word).
4. **The conferring statement** — the actual performative sentence.
5. **Signatories** — real offices, real names, real marks.
6. **The security/verification band** — present, findable, never hidden, but visually the quietest register on the page (Research §5's two-register principle).
7. **Legal footer** — smallest, always present, never fought over.

No concept direction may reorder this list. Colour, ornament, and type may change entirely between directions; this hierarchy may not.

## 5. Typography System

**Three roles, always three, regardless of concept:**

- **Display** (recipient's name, and the document's title where the direction calls for a title moment) — one confident, high-contrast, characterful face. Different per concept direction (see the concept deck) — this is deliberately *not* fixed at the Bible level, because the display face is the single biggest lever for making each of the ten directions feel genuinely different from each other, not ten palette swaps of the same skeleton.
- **Body/ceremonial** (the conferring paragraph, signatory titles, labels) — a formal serif or, for the Arabic half, a genuine Naskh-tradition face (Amiri or equivalent) — never a display face used at body size, and never a geometric sans pretending to be formal.
- **Utility/verification** (reference numbers, hashes, the QR caption, the legal footer) — a monospaced or a restrained grotesk, chosen specifically for maximum legibility at small size and under photocopying/scanning degradation, per the Research Report's passport-page principle. `font-variant-numeric: tabular-nums` wherever digits align in a column (transcript grade tables, dates).

**Rules that apply regardless of chosen concept:**

- The recipient's name never competes with itself: one weight, one size, set once. No shadow, no outline, no gradient fill.
- Arabic and English are never forced into visually matching line-lengths by shrinking one language to fit — each language gets its own considered measure.
- Letter-spacing on small-caps/label text is a deliberate design decision (typically 0.08em–0.24em depending on face and size), never a default.
- No paragraph of ceremonial body text exceeds roughly 72 characters per line — even centred, even short.

## 6. Colour System

A concept direction owns its own palette (this is one of the primary things that must differ radically between the ten directions — see the concept deck). What is fixed at the Bible level is the **usage discipline**, not the hex values:

- **Maximum three structural colours** per document (a ground, an ink, and one accent), plus black/near-black for body text and one reserved "alert" colour used only for stamps such as DUPLICATE / CERTIFIED TRUE COPY / PROVISIONAL — never for anything else, so that colour alone is enough to flag an exceptional document state.
- **The accent colour is spent once, decisively** — on the single most important structural element of that direction (a rule, a seal ring, a name), never sprinkled across many small elements. Diluting an accent across ten places is indistinguishable, at a glance, from having no accent at all.
- Every palette must pass a same-ink-photocopy test in principle: if the entire document were reproduced in black toner only, would the hierarchy from §4 still read correctly from value contrast alone? A palette that only works in colour has a real security and accessibility flaw (Research §5, Archival concept in the deck).

## 7. Border Philosophy

A border on a security document is never decorative alone — per Research §5, it must be structurally load-bearing. Three legitimate reasons a border exists here, and every concept must be able to name which it is using:

1. **Anti-counterfeit texture** — a fine engraved or lattice pattern that is compositionally part of the frame, expensive to reproduce faithfully at low resolution (this project's existing guilloché and micro-lattice work already satisfies this).
2. **Framing/containment** — a simple rule that tells the eye "the document ends here," borrowed from the wax-seal/vellum tradition of a physically bounded sheet.
3. **Cultural-geometric statement** — an authentic Islamic-geometric or heraldic border that is doing identity work, not just texture work.

A concept may use one, two, or all three reasons simultaneously, but must not use ornament that serves none of them — decoration with no structural or identity justification is exactly what reads as "template," per Research §5's forger-resistance principle.

## 8–9. Ornament Philosophy and Islamic Geometric Language

The existing v2.1/v3 work already established the correct method: **compute the geometry from its real mathematical construction, never trace or license a generic "Islamic-style" asset.** This Bible formalises that as permanent policy, not a one-off engineering choice:

- Star-polygon and khatam constructions (as already used for the corner ornament) are built from their real angular construction (n-point stars via `(360/n)°` rotation, overlaid at the classical offset for an 8-fold or other n-fold rosette) — this is both more authentic and, practically, infinitely reusable at any scale without a raster asset ever going blurry.
- Girih strapwork, muqarnas-derived corner transitions, and geometric key-patterns are each real, distinct traditions — a concept direction should commit to *one* family and execute it with discipline, not blend fragments of several into a "generically Islamic" pastiche.
- Ornament density is a direction-defining choice, not a universal default: some of the ten concepts (Luxury Minimalist, Museum Edition, Archival Edition) deliberately use almost none, and that absence is as considered a decision as another direction's density.

## 10. Security Printing Philosophy

Security is not a checklist bolted onto a finished layout — it is designed *as* the layout, per Research §5. The full architecture, split by what is genuinely a rendering/composition decision versus what is a data-model decision (the latter tracked honestly as backlog, not faked):

**Composition-level (design decisions, buildable once a concept is approved):**
- Guilloché/lattice background as structural texture, not corner decoration (already proven in v3).
- Microprint set on a real circular or bordering path — genuine repeated text, legible only on close inspection (already proven in v3's seal ring).
- Two-register typography: ceremonial face for the reading text, a distinct utility face for the verification band (§5 above).
- A dedicated, undisguised "this is the verification zone" band, never hidden inside the ornamental field — passport-page discipline (Research §5).

**Data/cryptographic-level (already real, from earlier Stage 3 work, and inherited unchanged by every concept):**
- HMAC-SHA-256 content-hash digital fingerprint (`functions/_lib/document-hash.js`).
- Permanent Verification ID + per-type reference numbering (`functions/_lib/graduation-document-no.js`).
- QR (error-correction level Q) + Code 128 barcode, both computed, not stock imagery (`functions/_lib/qrcode.js`, `functions/_lib/barcode128.js`).
- Public Tier-1 verification platform logging every check (`verification_log`, spec §3.7/§5).
- Real, on-file signatory snapshots (never a blank or generic signature line) — `functions/_lib/document-signatories.js`.
- Real, status-aware seal registry that refuses to fabricate a seal (`functions/_lib/document-seals.js`).

**Named as genuine future data-model work, not implemented and not faked as display text on any concept:** duplicate detection, certified-copy/reissue/replacement history as a queryable chain, and a formal revocation status. These require new schema (a `document_revisions` or similar table keyed to the existing `graduation_documents` row) and are out of scope for a visual redesign — tracked here so they are never silently dropped from the roadmap.

**An honest boundary, stated once and binding on every future round:** an "invisible UV layer" cannot be *specified* by an HTML/CSS/PDF rendering pipeline — UV-reactive ink is a physical print-production choice made at the print vendor, entirely independent of what this codebase renders. What this Bible can and does specify is *where* a UV mark would sit compositionally (a reserved, undisturbed zone near the seal) and what a print vendor would need to add it — but no digital render can simulate or fake having a UV layer, and no future round should claim one exists digitally.

## 11–13. Paper, Foil, and Embossing Specification

Real print-production specification, for whichever print vendor eventually produces physical parchment/certificate copies (the digital/PDF version, per §23–24, does not require any of this, but should be *designed to look correct when it eventually is printed this way*):

- **Paper**: minimum 220–250 gsm for a standalone certificate sheet (a Transcript or multi-page document may run lighter, 120–160 gsm, since it is bound rather than framed); cotton-content security paper (25–100% cotton) where budget allows, since cotton fibre is itself a basic anti-photocopy cue (it does not reproduce identically under a standard office copier's contrast curve); a subtle laid or wove texture, never glossy stock, which reads as inexpensive regardless of what is printed on it.
- **Foil**: reserved for a single element per concept, generally the seal ring or a single bordering rule — gold or copper foil, hot-stamped, never foil used as a fill colour substitute (foil that covers a large flat area reads cheaper, not more expensive, than foil used as a precise accent).
- **Embossing**: a blind (uninked) emboss of the institutional crest, positioned to physically overlap or sit adjacent to the printed seal, is the single most effective, lowest-cost-per-unit anti-counterfeit physical feature available — it requires a die most counterfeiters will not have made, and it photocopies as a faint shadow rather than disappearing, which itself becomes a verification cue ("hold at an angle").

## 14–15. Guilloché and Watermark Specification

Both already exist as real, working code (`guillocheSvg()`, `watermarkRosetteSvg()`, the crest watermark image) and this Bible formalises their governing rules rather than re-specifying them from zero:

- Guilloché parameters (ring count, amplitude, frequency) must always be generated from a closed mathematical formula computed at render time, never a static traced asset — this is both a security property (genuinely difficult to reproduce without the generating formula) and a maintenance property (infinitely reusable at any output resolution).
- A watermark is always **at least two independently generated layers** at different opacities and scales (the real crest photograph plus a computed geometric layer) — stated honestly, per the existing v3 code comment, as a *deterrent* against casual screenshot reproduction, never a claim of literal screenshot-proofing, which no on-screen render can achieve.

## 16–17. Signature System and Seal System

Unchanged in principle from the already-built and spec-governed system (Master Spec §13.2–§13.3, `document-signatories.js`, `document-seals.js`) — restated here as binding design law, not just backend logic:

- A signature block always names the **office**, set with equal typographic seriousness to the name, per Research §1's collegiate principle.
- A signature is never fabricated; a vacant office produces a named `SignatoryVacancyError`, never a blank line pretending nothing is missing.
- A seal is never fabricated; an absent real seal produces a clearly labelled reserved position, never a placeholder pretending to be real.
- Every concept direction's seal *framing* (ring, foil suggestion, microtext) is a shell-level design decision and may differ freely between concepts; the seal artwork itself, and the real/placeholder logic governing it, does not change with the visual concept chosen.

## 18–19. QR System and Verification System

Already real (`functions/_lib/qrcode.js`, `functions/api/graduation-documents/verify.js`, `/verify-graduation-document/`) — this Bible's contribution is purely about how it is *presented*:

- The QR/barcode pairing sits inside the dedicated verification band (§10), never inside the ornamental field, so a phone camera scanning it is never fighting decorative texture for contrast.
- The verification band always states, in plain language and in the reader's own language (EN/AR), what scanning it does — "Scan to verify" is already correct and stays correct across every concept.

## 20. Anti-Counterfeit Architecture — the layered model

Stated as a single model every concept direction must satisfy, synthesising §10–19 into one picture:

| Layer | Defeats | Already real? |
|---|---|---|
| Cryptographic hash + verification ID + public lookup | Wholesale forgery, altered field values | Yes |
| QR + barcode | Casual/manual transcription errors, quick trust check | Yes |
| Guilloché + micro-lattice + microprint | Low-resolution photocopying/scanning reproduction | Yes (composition) |
| Real seal + real signatures, snapshotted at issuance | A later staff change invalidating old documents; a document claiming authority never actually exercised | Yes |
| Embossing + foil + cotton paper | Physical reproduction on a home/office printer | Print-vendor step, specified not implemented |
| Duplicate/reissue/revocation tracking | A stolen or superseded document being presented as current | Named backlog, not built |

No single layer is asked to do all the work — this is the point of a *layered* architecture, and it is the honest answer to "do not merely add QR codes and hashes."

## 21. Print Finishing

For the eventual physical-print pipeline: a clean-edge cut (not a deckled edge, which reads more "artisan stationery" than "state instrument") for Class A documents; a genuine die-cut corner radius only if a concept direction's ornament language calls for it (most should not — a hard rectangular corner is the more authoritative default per Research §4's royal-warrant precedent); no laminate, which cheapens perceived value and defeats an embossed feature by flattening it.

## 22. Accessibility

- Every colour pairing used for body or verification text meets WCAG AA contrast (4.5:1) at minimum against its ground, checked per concept — ornamental/watermark layers are explicitly exempt (they are meant to sit under the 3% opacity floor) but body copy is not.
- The digital render always carries real `alt` text on every meaningful image (crest, seal, QR) — already true of the existing shell and non-negotiable going forward.
- Minimum body text size in the digital render: 0.85rem / display-hero minimum roughly 2rem, both already satisfied by the current shell and to be held as a floor by every concept, not just a starting point to shrink from for density.

## 23. Digital Version

The screen/PDF render is the primary, most-produced version (§6.2a) and must be designed *as* the primary artifact, not as a lesser derivative of an imagined printed original — every concept must be evaluated first as a rendered PDF, not as a mockup that assumes physical foil/emboss it cannot actually show on screen.

## 24. Mobile Version

The Digital Graduate Profile and the eventual "wallet" presentation (a simplified, single-screen summary card: crest, name, document type, verification ID, QR) are a *distinct* composition, not the full certificate shrunk to fit a phone — this is already the right instinct behind the existing `/verify-graduation-document/` and Digital Graduate Profile pages and should be formalised as policy for every future concept: never ship a "certificate but smaller" as the mobile view.

## 25. Archival Requirements

- PDF/A target (already the stated goal at §8/§3.5 of the Master Spec) for long-term digital preservation, independent of which visual concept is chosen.
- The content-hash snapshot (§3.5) means the archival copy is provably unaltered regardless of how many times the visual shell is redesigned in future years — a graduate's 2026 certificate stays verifiably the 2026 design even after Design System v4, v5, etc. exist. This Bible should itself be versioned the same way future revisions happen — see §26.

## 26. Governance of this Bible

This document is the permanent design constitution for SHRS academic documents, in the same spirit as the Master Graduation Document Specification is the permanent functional constitution. It may only be amended by:

1. A new, explicitly numbered Design System version (matching the existing v1→v2→v2.1→v3 convention already used in the shell's own file-header history), with the reason for the change stated in the same section this project already uses for build-progress logging (Master Spec §23).
2. Never silently — a future round that wants to change the palette, typography, or ornament policy established here must say so explicitly, the same "never rushed, never half-finished, never silently redefined" discipline this entire engagement has held to.

---

**Next**: ten concept directions, each a genuinely different design philosophy (not ten colour variants of this Bible), presented for Board selection. Implementation of any certificate remains paused until one is chosen.
