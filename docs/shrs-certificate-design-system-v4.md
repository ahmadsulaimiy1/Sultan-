# SHRS Certificate Design System v4 — Royal Heritage / Islamic Classical (Approved Direction)

**Phase 4 of the Final Executive Creative Direction. Status: approved by the client from the ten-concept deck. This is the concrete system Phase 5 builds against — everything here resolves a policy from `docs/shrs-certificate-design-bible.md` to a specific, buildable decision. Per the Bible's own §26 governance rule, this supersedes Design System v3 and is recorded here explicitly, not silently.**

## Why this hybrid, not one pure concept

Royal Heritage alone would have been the safe, low-risk evolution of the existing v2.1/v3 shell — but on its own it under-uses the second real fact about SHRS from the Bible's §2 Institutional Identity: this is a genuinely bicultural institution, not a Nigerian school with Islamic ornament applied as decoration. Islamic Classical alone would have made that culture legible but discarded the real, already-extracted heraldic crest work. The hybrid keeps the crest/seal/signature apparatus in its full heraldic register (§ below) while replacing the ornament and palette language around it with an authentic Islamic-manuscript construction — so the document reads, correctly, as a Nigerian royal Islamic institution's own credential, not a generic royal-adjacent template with a crest pasted on.

## 1. Palette (resolves Bible §6)

| Token | Hex | Role |
|---|---|---|
| `--ground` | `#F3EEDD` | Page ground — Islamic Classical's manuscript ivory, warmer and more historically specific than v3's plain milk white |
| `--ink` | `#221A10` | Body/structural ink — near-black, warm, kept close to v3's espresso for continuity |
| `--teal` | `#0F5C57` | **Primary accent** — the strapwork border, Arabic display emphasis, the security-band rule. Spent decisively per Bible §6, not diluted |
| `--gold` | `#9C7A35` | **Secondary accent** — reserved for the crest/seal/signature apparatus only (the heraldic half of the hybrid), never used for body ornament |
| `--oxblood` | `#6E1F2B` | **Alert-only** — DUPLICATE / CERTIFIED TRUE COPY / PROVISIONAL stamps exclusively, per Bible §6's reserved-alert-colour rule. Never appears elsewhere |
| `--sand` | `#C9BFA0` | Hairline dividers, the quietest register |

Same-ink photocopy test (Bible §6): teal and gold both render as distinguishable mid-greys against the ivory ground in greyscale; oxblood renders darkest of the three, preserving the "something exceptional is flagged" signal even in monochrome.

## 2. Typography (resolves Bible §5)

- **Display (recipient name)**: an engraved capitals-and-small-caps treatment for the Latin name — not a script face — set at the same generous scale v3 already established (Playfair Display retained as the nearest licensed face already wired into the shell's font stack; a true copperplate face is a candidate future embed, not required to ship this round).
- **Arabic dignity clause (directly from Research §3 and Bible §2)**: in the Arabic render, the Arabic recipient name and conferring text are never shrunk to match the English version's line length — each language keeps its own considered measure, per Bible §5. This was already broadly true in v3; v4 makes it an explicit, binding rule rather than an emergent property of the font-fallback chain.
- **Body/ceremonial**: Cormorant Garamond (Latin) / Amiri (Arabic), unchanged from v3 — already benchmark-correct per the Research Report.
- **Utility/verification**: unchanged monospace/tabular-nums discipline from v3.

## 3. Border and ornament (resolves Bible §7–9)

- **Retained from Royal Heritage**: the full crest masthead (Nigeria coat of arms + SHRS institutional crest), the khatam corner rosette, the embossed/foil seal ring with its microtext.
- **Replaced from v3**: the crosshatch micro-lattice band is replaced with a computed **girih strapwork band** — an interlocking octagon/star-polygon construction (the same authentic-geometry discipline the Bible mandates in §8–9), set in `--teal` rather than gold, so the two accent colours are legible as two distinct systems (heraldic gold for the institutional apparatus, manuscript teal for the framing geometry) rather than one undifferentiated gold everywhere.
- Corner ornament stays gold (it is functionally part of the heraldic system); the girih band along the edges is teal (it is functionally part of the manuscript framing system). This colour-coded separation is itself a hierarchy device, not just a palette choice.

## 4. Security band (resolves Bible §10, §18–19)

Unchanged mechanism (HMAC-SHA-256 fingerprint, QR, barcode, reference/verification IDs) — restyled only: the band's rule and background tint move from the v3 cream/gold treatment to a teal-tinted variant, keeping the "quietest register on the page" position in the hierarchy (Bible §4) while staying visually part of the v4 system rather than a leftover v3 fragment.

## 5. What does not change

Seal real/placeholder logic, signatory snapshot logic, `documentKind` stamps, referenceNo-gated seal/security-band rendering, and every data-model boundary named in the Bible §10 and §20 stay exactly as built — this is a visual system revision, not a functional one.

## 6. Scope of this round

Per the Executive Creative Direction's Phase 5 instruction ("build one flagship certificate — not twenty — that becomes the benchmark for every other document"): this round rebuilds the **shared shell** (`document-template-shell.js`, which every document type inherits) and verifies it specifically against the **Graduation Certificate**, the named flagship document. Every other document type inherits v4 automatically the next time it is issued, but is not separately re-verified in this round — each deserves its own dedicated visual QA pass, per this project's standing "never rushed" discipline, the same pattern v2→v2.1→v3 already followed.
