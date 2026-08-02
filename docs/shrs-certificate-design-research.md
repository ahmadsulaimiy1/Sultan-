# SHRS Certificate & Academic Documents — Design Research Report

**Phase 1 of the Final Executive Creative Direction. Status: Research only — nothing in this document is implemented.**

## 0. Methodology and an honest limit

This report draws on the well-established, widely published body of knowledge around academic and government security-document design: the documented history of engraving and guilloché in banknote and diploma production, the public visual conventions of collegiate and Islamic manuscript typography, and the design literature on seals, watermarks, and anti-counterfeit architecture. It does **not** claim to have fetched or pixel-inspected a specific current certificate from Oxford, Cambridge, Harvard, or any Ministry of Education — this session has no live web access, and several of the named institutions do not publish their exact security artwork publicly for the same reason a mint does not publish banknote plates. Where a claim below is about a *general, long-documented convention* of a category of document (e.g. "collegiate certificates use engraved Roman capitals for the institution's Latin or English name"), it is reliable. Where it would need to be a claim about one specific living document's exact Pantone value or paper GSM, it is deliberately not made. This is the same "nothing is invented" discipline this engagement has held to throughout — extract principles, not fabricate specimens.

The goal of this phase is not description ("Oxford certificates are cream-coloured"). It is **mechanism** — *why* a given convention makes a document feel authoritative, so those mechanisms, not the surface look, are what SHRS's own system inherits.

---

## 1. Collegiate certificates (Oxford / Cambridge / King's College London / Imperial College London)

**What is consistently true of this category, and why it works:**

- **Latin or formal English is used for the constitutive act, never conversational phrasing.** "Has been admitted to the degree of..." rather than "has completed..." — the document *performs* an action (admission, conferral) rather than *reporting* one. This is a legal-instrument register, not a descriptive one. **Mechanism:** performative language signals that the paper itself is the event of record, not a receipt for an event that happened elsewhere.
- **The institution's arms/seal outrank the recipient's name in visual weight**, even though the recipient's name is what the holder cares about. **Mechanism:** authority documents subordinate the individual to the issuing body — the opposite of a marketing document, where the individual (customer) is centred. A certificate that makes the *name* the biggest thing on the page reads as a personalised gift, not an instrument of record.
- **Signature blocks name an office, not flourish.** "Vice-Chancellor," "Registrar" — the title is set with equal or greater typographic weight than the handwritten mark. **Mechanism:** the document is signed by an *office*, which persists, not by a person, who doesn't — this is what makes the credential still valid decades after the signatory has left post or died.
- **Restraint in colour.** Collegiate certificates overwhelmingly use one or two inks (often black text with a single heraldic colour for the seal/crest), on a warm, slightly textured stock. **Mechanism:** multi-colour process printing was, historically, exactly what a forger could not easily reproduce cheaply — a single well-engraved colour, printed by a trusted press, was *more* prestigious than a garish multi-colour sheet, and that hierarchy of taste has outlived the technical reason for it.

## 2. American research-university diplomas (Harvard and peers)

- **Heavier reliance on the wax/embossed seal as the singular focal security-and-status device**, often larger and more central than at UK collegiate peers. **Mechanism:** without a centuries-old heraldic tradition to lean on, the American research university's diploma leans harder on the seal as the one unmistakably "official" mark — round, symmetrical, and old-looking regardless of the institution's actual age.
- **Text blocks are frequently set as a single large paragraph in a display serif, centred, with almost no subheadings.** **Mechanism:** subheadings imply the reader needs navigation — a diploma is read once, in full, at a ceremony or later a single time by an employer; navigation aids would undercut its status as ceremonial prose rather than a form.

## 3. Continental and Islamic-world academic traditions (Sorbonne, ETH Zürich, Saudi Ministry of Education, UAE government)

- **Sorbonne/ETH-style continental diplomas favour a more architectural, symmetrical letterform system** (often close to Didone or geometric-humanist serifs) over the more organic Old Style faces UK collegiate documents favour. **Mechanism:** this reflects a print culture descended from state administrative documents (the Napoleonic *diplôme*) rather than a guild/college tradition — the document reads as issued by a *state*, not a *fellowship*.
- **Saudi and UAE governmental certificates place the Arabic text as the primary, not secondary, language** — larger, first in reading order, with the national emblem given equal or greater prominence than the institutional crest. **Mechanism:** in a bilingual state document, language order is a genuine statement of sovereignty and primary audience, not a cosmetic choice — this is the single most direct precedent for how SHRS should treat its own EN/AR pairing, and the existing shell (§9 of the Master Spec) already gets this partly right by rendering the Arabic version as a true mirror rather than a translated afterthought.
- **Islamic geometric ornament in this category is disciplined, mathematical, and marginal — never filling the reading field.** Girih strapwork, muqarnas-derived corner transitions, and star-polygon medallions are used as *frames*, never as backgrounds competing with text. **Mechanism:** the geometry is meaningful (it derives from real compass-and-straightedge constructions with a long theological and mathematical history in this tradition) — using it thinly and precisely signals genuine cultural literacy; using it densely or decoratively signals costume, not identity. This is exactly the distinction this project already made in Design System v2.1/v3 by computing an authentic khatam construction rather than tracing generic "Islamic-style" clipart.

## 4. Royal warrants and government honours

- **The seal or armorial achievement is not merely present — it is the compositional anchor the entire page is built around**, often with the body text arranged to leave it visually undisturbed rather than flowing around it as an afterthought. **Mechanism:** in a monarchical or head-of-state instrument, the seal *is* the authority; the text is explanatory context for the seal, not the other way around.
- **Extremely generous margins relative to the text block** — often 2–3× what a commercial document would use. **Mechanism:** unused space is the most expensive thing a printer can put on a page (it is paper that carries no information) — deliberately wasting it is a direct, legible signal of resources not spent on efficiency, i.e. of institutional wealth and unhurriedness.

## 5. High-security banknotes and passports

- **Security features are integrated into the composition, not bolted onto a blank corner.** A banknote's guilloché is *also* the background texture of the portrait vignette; microprint often runs along a border that would exist compositionally anyway. **Mechanism:** a forger can strip an obviously "added" security sticker; a forger cannot strip a security feature that is structurally load-bearing to the design without visibly destroying the design itself. This is the single most important principle for SHRS's own security architecture (§ below in the Design Bible) — and the direct justification for why the v3 shell's guilloché, microtext, and lattice border were built as literal structural elements of the frame rather than as a stamp placed on top of a finished layout.
- **Passports use a strict, unglamorous type system for the machine-readable and data-page zones** — monospaced, high-contrast, no ornament — deliberately different in register from the ceremonial cover. **Mechanism:** the document has two audiences at once (a human reading it, and a scanner/officer verifying it) and refuses to let one compromise the other's legibility. SHRS's own QR/barcode/reference-number band should be held to the same discipline: legible-first, ornamental second.

## 6. Historic manuscript diplomas and Ijazahs

- **Text hierarchy is carried by scale and ink colour change (often red for names/dates against black for formula text), not by different typefaces.** **Mechanism:** a single, disciplined hand or type family, varied only in scale/colour, reads as more authoritative than a document assembled from several typefaces — variety in typeface choice reads as a document assembled by committee, not authored with a single confident hand.
- **The chain of transmission (isnad) in a real Ijazah is itself the content, not a footnote** — who taught whom, in what order, is often the single largest block of text on the document. **Mechanism directly relevant to SHRS**: for the eventual Ijazah / Tahfiz Certificate document types named in the Executive Creative Direction, the "who certified this student, under whose authority" chain is not decoration — it is the document's actual reason for existing, and should be composed with the same weight collegiate diplomas give the conferral clause.

---

## 7. Cross-cutting principles extracted (feed directly into the Design Bible)

1. **Hierarchy of authority, not hierarchy of attention.** The institution/issuing office outranks the recipient's name; the recipient's name outranks the decorative apparatus. A document that makes the biggest thing on the page the prettiest ornament, or the recipient's name, has its hierarchy backwards.
2. **Performative, not descriptive, language.** The document *does* the conferring; it does not report that conferring happened elsewhere.
3. **Security is structural, not applied.** Every security feature should also be doing composition work (frame, texture, rhythm) — if it could be deleted without the design visibly breaking, it isn't integrated yet.
4. **Restraint reads as resource, not as poverty.** Generous unused space, a disciplined ink/colour count, and a single confident type family communicate more wealth and authority than density or variety.
5. **Two-register typography.** A ceremonial register for the conferring text and a data/verification register for the machine-readable zone — never let one compromise the other.
6. **Language order is a sovereignty statement, not a layout choice**, in any bilingual instrument — directly actionable for SHRS's EN/AR pairing.
7. **Ornament must be mathematically real, not decoratively generic**, when drawing on a specific cultural geometric language — SHRS's own Islamic-geometric vocabulary must stay in the authentic-construction register already established, never drift into generic "Islamic-style" clipart.

This report feeds directly into `docs/shrs-certificate-design-bible.md` (Phase 2) and the ten concept directions presented for selection (Phase 4). No certificate template has been touched.
