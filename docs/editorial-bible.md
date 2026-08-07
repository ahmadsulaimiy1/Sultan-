# Sultan Hanafi Royal Schools — Editorial & Brand Bible

*Flagship digital identity reference. Version 1.0.*

---

## Preface — How This Bible Was Calibrated

The creative brief behind this project asked for a "world-class international
English institution" positioned toward Gulf families and global elites,
under a fictional name ("Worldwide English College"). The real client
behind this repository is **Sultan Hanafi Royal Schools** — a registered
(2017), Lagos-based day-and-boarding institution in Ikorodu, teaching a
hybrid Islamic-and-secular curriculum to a Nigerian and West African
community.

Those two things were reconciled as follows:

- **Craft, tone, and design discipline** were raised to the standard the
  brief demands — the same rigor a luxury institution or premium
  publication would apply. Every anti-cheap, anti-template, anti-AI-slop
  principle in the brief was applied literally to this build.
- **Facts were not invented.** No claim appears on the site that isn't
  sourced from the founder's own words, the school's governance records,
  its published policies, or independent reporting (Punch Newspapers,
  Aug 2023). Where the brief's ambitions imply information the school
  hasn't published — accreditation bodies, tuition figures, an academic
  calendar, an international-student pathway — the site says so plainly in
  a labelled placeholder rather than fabricating it. Search `placeholder-block`
  in `index.html` for the current list.
- The reference crest supplied for inspiration (a navy-and-gold "Worldwide
  English College, London Campus" seal) was treated as a **mood board**,
  not a brand to imitate. Its formal register — crown, shield, laurel,
  monogram — informed the *institutional design vocabulary* (seals,
  ledgers, folios, chapter marks) without borrowing its name, its country
  claim, or its colour story.

This document describes the brand system as it is actually built into
`index.html` today, so any future page, print piece, or campaign extends
it consistently rather than drifting toward generic "school website"
conventions.

---

## Part I — Institutional Identity

### Vision
> To be recognised as a leading institution excelling in knowledge
> dissemination and character building — creating a positive impact
> wherever our presence is felt.

### Mission
> To provide holistic education by imparting both Islamic and secular
> knowledge through rigorous research and effective teaching methods —
> promoting ethical behaviour and instilling strong values in pursuit of
> a secure, informed, and progressive society.

### The CLEVER Standard (Core Values)
| Letter | Value | In practice |
|---|---|---|
| C | Creativity | Innovative thinking, encouraged from Nursery through Qur'an College |
| L | Leadership | Empowering learners to lead, not just perform |
| E | Engagement | Active participation over passive instruction |
| V | Versatility | Well-rounded growth across secular and Islamic disciplines |
| E | Ethics | Moral responsibility as a graduation outcome, not an add-on |
| R | Reliability | Trust and accountability toward parents, the board, and the community |

### Educational Philosophy
A **hybrid curriculum by design, not compromise**: the Royal College and
Basic School run the Nigerian National Curriculum enriched with
entrepreneurship, financial intelligence, leadership, and technology
electives; School of Islamic and Arabic Studies and Qur'an College run the Saudi
Arabian curriculum with Saudi-approved texts. Both tracks report to one
board, one Head of Schools / Administrator, and one disciplinary and pastoral framework — the
institution's real point of differentiation versus either a purely
secular or purely Islamiyyah school in the same market.

### Governance Model
A Board of Governors plus a Management Team spanning finance,
education, and Islamic scholarship (full roster: `index.html` §Governance).
Every policy on the site — Assessment, Anti-Bullying, Career, Dress Code,
Equal Opportunity, First Aid, Health & Safety, Visitors, Complaints — is
**prepared → reviewed → approved** by three named office-holders, with a
stated next-review date. That three-signature chain is itself a brand
asset: it is what "institutional" means in practice, and it should appear
on every future policy document the school publishes.

### Heritage
Founded by Zakaria Olanrewaju Anofi in memory of his father, Anofi Aliu
Akano, a Nigerian Ports Authority clerk whose own schooling was cut
short. Officially registered December 2017, rooted in the Imowonla
community. This origin story — a debt of gratitude made into an
institution — is the emotional core of the brand and should anchor any
future "About" or founder-facing content, in place of generic "our
history" copy.

---

## Part II — Programme Architecture

Five institutions under one board, one standard:

### I. Basic School — Ages 2–10
Early-years foundation blending secular and Islamic instruction. Led by
Head Teacher Mrs. Kareemat Abdurazaq.

### II. Royal College — Ages 10+, established 2021
Junior + senior secondary, seven academic departments:

| Department | Subjects |
|---|---|
| Languages | English, Yoruba, French/Hausa/Chinese (future) |
| Mathematics & ICT | Mathematics, Further Maths, Computer Studies, Data Processing, Coding |
| Humanities | Geography, History, Government, Civic Ed., Art, Literature, Social Studies |
| Science & Technology | Biology, Physics, Chemistry, Agric. Science, Food & Nutrition, Technical Drawing, Basic Tech., Home Econ., PHE |
| Commerce & Management | Financial Accounting, Commerce, Economics, Bookkeeping, Marketing, Business Studies |
| Arabic | Arabic, Nahwu & Sarfu, Aruud, Balaghah, Al-Adab-Al Arabiy, Al-Inshaw |
| Islamic Sciences | Fiqh, Usul-Fiqh, Tawheed, Seerah, Tajweed, Hadith, Ulumul-Hadith, Ulumul-Tafseer, Tafseer, Ilmu Qiraat |

### III. School of Islamic and Arabic Studies — All ages
Weekday (Mon–Wed, 2–6pm) and weekend (Sat–Sun, 9am–3pm) tracks for the
wider Muslim Ummah, not limited to enrolled day/boarding students.

### IV. Qur'an College — Day & Boarding, 24–36 month programme
Full Qur'an memorisation plus Qur'anic sciences, Arabiyyah, and Islamic
knowledge, culminating in standard **Ijazaat** (certification/licence) —
the closest the school has to a formal credentialing pathway, and worth
foregrounding wherever the brief calls for "certificates, diplomas,
progression pathways."

### V. Sultan Hanafi Online & Distance Learning School
Recognised as a fifth Constituent Institution by the Board's governance
restructuring amendment of 2026-08-04. Newly established, not yet
operating a programme or holding a curriculum, and its headship is
currently vacant — stated plainly here rather than inventing content
for it.

### Progression Pathway
Basic School → Royal College (secular + Islamic tracks run in
parallel, not sequentially) → optional Qur'an College boarding track for
memorisation-focused students aged 9–16 → Ijazaat on completion. The
School of Islamic and Arabic Studies runs alongside all of the above as a
community-facing, non-exclusive offering.

### What Doesn't Exist Yet (do not fabricate)
- A published academic calendar / term dates
- Published tuition fee schedule
- A scholarship policy
- Any international-student admissions track
- Any accreditation body affiliation beyond the Nigerian curriculum and
  Saudi-curriculum adoption already stated

These remain flagged as `placeholder-block` sections in `index.html`
until SULTAN supplies the real data.

---

## Part III — Brand System

### Colour System
The CSS custom properties keep their original variable names
(`--navy`, `--navy-deep`, `--emerald`) for minimal diff risk, but render
the confirmed **Coffee & Gold** palette, not literal navy or emerald.
Treat the *names on the right* as the brand vocabulary in all design
conversation and documentation; the *variable names on the left* are an
implementation detail.

| CSS variable | Hex | Brand name | Role |
|---|---|---|---|
| `--navy` | `#3B2A1D` | **Royal Coffee Brown** | Primary ground colour — hero, nav, dark sections |
| `--navy-deep` | `#221709` | **Heritage Espresso** | Deepest shade — footer, section transitions, depth |
| `--emerald` | `#6B4A2E` | **Warm Bronze** | Mid-tone accent, secondary surfaces |
| `--gold` | `#C6A15B` | **Royal Gold** | Primary accent — rules, borders, icons, CTA fills |
| `--gold-bright` | `#E9CE8A` | **Champagne Gold** | Highlight state — headings on dark ground, hover |
| `--ivory` | `#F7EEDF` | **Premium Cream** | Primary light ground — alternating section backgrounds |
| `--crimson` | `#7C1F2E` | **Rich Burgundy / Oxblood** | Editorial accent — quotes, links on light ground, emphasis |
| `--ink` | `#2A2016` | **Charcoal Ink** | Body text on light backgrounds |
| `--line` | `rgba(198,161,91,.38)` | **Gold hairline** | All dividers, ledger rows, underlines |

**Usage discipline:** dark sections (hero, governance, facilities,
contact) alternate with cream sections (director, story, values,
academics, admission) — never two dark or two cream sections back to
back. Burgundy is reserved for quotes, pull-text, and links on light
ground; it never fills a background. Gold is a *line and accent* colour,
never a large fill — this is what keeps the palette from reading as
"gold-and-brown template" instead of "heritage institution."

### Typography System
| Typeface | Role |
|---|---|
| **Cinzel** (500/600/700) | All-caps display: eyebrows, chapter folios, nav, monogram letters, section labels. The "carved stone" register. |
| **Cormorant Garamond** (400–700, italic) | Editorial serif: headlines, pull-quotes, mission/vision lead text, board-member names. The "fine bookbinding" register. |
| **Inter** (400–700) | Body copy, UI chrome, form labels. The only sans-serif in the system — kept purely functional. |

No other typefaces should enter the system. This three-role split
(carved-stone caps / editorial serif / functional sans) is what
distinguishes the site from template-driven schools that use a single
rounded sans everywhere.

### Iconography & Motifs (the "anti-cheap" toolkit)
These patterns exist specifically **instead of** the generic card-grid,
icon-set, gradient-hero conventions the brief calls out as cheap:

- **Folio markers** (`Chapter II — Heritage`) open every major section —
  a museum-catalogue device, not a generic "eyebrow" label.
- **Ledger rows**, not card grids, list every person and policy: name,
  credentials, role in three aligned columns with a hairline rule below —
  the register of a formal institutional directory, not a team-page
  avatar grid.
- **Monogram rail** renders CLEVER as six lettered columns with a
  vertical hairline between them, not six icon boxes.
- **Dot-leader facility index** (`01 College Hall ······`) replaces a
  photo-tile grid — the register of a museum floor plan or table of
  contents.
- **Asymmetric mission/vision** — a wide, gold-bordered lead statement
  beside a narrower aside, not two equal boxed cards.
- **Crest watermark + institutional frame** — a faint corner-bracket
  frame and oversized low-opacity seal mark dark sections, echoing
  letterhead and official seals without literal skeuomorphism.
- **Ceremonial motion only**: a slow "breathing" scale on the crest, a
  staggered word-reveal on the hero headline, section reveal-on-scroll —
  restrained, editorial pacing, not scroll-jacking or gimmick animation.
  All motion respects `prefers-reduced-motion`.

### Tone of Voice
- First person from named leadership (the Director's message), not
  faceless institutional "we" — authority through a signed name and
  stated credentials, not marketing copy.
- Numbers spelled with precision, not superlatives: "seven academic
  departments," "24 to 36 months," "80–100 = A+" — specificity reads as
  more prestigious than adjectives like "world-class" repeated on every
  line.
- Policies are written in full institutional register — Introduction,
  Purpose, Scope, Provision, Conclusion, sign-off — because a real
  reviewed-and-approved policy is a stronger prestige signal than any
  amount of hero copy.
- Silence over invention: where data doesn't exist, the site says so in
  the same design language as everything else (`placeholder-block`),
  rather than switching to a lighter, apologetic tone.

### Photography Direction
Not yet sourced — the two reference images in this repo are a mood-board
crest and an existing print flyer, not usable site photography (the
flyer's laboratory/library/masjid photos are low-resolution and
watermarked for print, not web). Recommended direction when real photos
arrive: available light, un-staged classroom and masjid interiors,
consistent warm colour-grade toward the Coffee/Gold palette, no stock
photography, no stand-and-smile group shots — the same register as the
existing "Take a Peek Inside" facilities index implies.

---

## Part IV — Website Architecture (Current State)

Single-page flagship (`index.html`), eleven chaptered sections, in order:

1. Hero — identity statement + three calls to action
2. Director's Message
3. Our Story (Heritage, sourced to Punch Newspapers)
4. Seal quadrants (Crescent & Star / Open Book / Three Stars / Tree)
5. Welcome / pull-quote from a parent & board member
6. Mission, Vision & Values (CLEVER)
7. Governance & Leadership (board, Management Team, key staff — full ledger)
8. Academics (five institutions + curriculum note + open placeholder)
9. Boarding Facility
10. Admission (12-step process + required documents + open placeholder)
11. Facilities (12-item dot-leader index)
12. Sultan Zakariya Hanafi Foundation (six giving categories)
13. School Policies (9 full accordion policies)
14. Contact (address, phones, socials, form) + Footer

This is already a complete Phase 1–4 execution against the brief for a
**single flagship page**. What has *not* yet been decided or built:

- Whether this becomes a true multi-page site (dedicated URLs per school,
  per policy, an Arabic-language mirror) versus staying a single
  long-form flagship page.
- An Arabic-language version — the brief calls for languages "designed
  natively, not merely translated," which for an Islamic institution with
  an Arabic curriculum is a real, non-cosmetic opportunity, not a
  translation-plugin afterthought.
- Real photography once supplied.
- The three placeholder gaps (calendar, fees/scholarships, international
  pathway) once SULTAN provides source data.

---

## Part V — Open Decisions for the Client

Before further build work, the following need a decision rather than an
assumption:

1. ~~Single flagship page vs. multi-page site~~ — **decided and built.**
   See `docs/site-architecture.md`: the site now has 14 dedicated English
   pages plus a slimmed homepage digest.
2. ~~Arabic mirror~~ — **decided (full RTL) and complete.** Every
   English page now has a full Arabic counterpart under `/ar/` (14
   pages each side, 28 total), sharing one `[dir="rtl"]` design system
   (structural mirrors, Amiri/Cairo Arabic typefaces) rather than a
   translation-plugin afterthought. The language switcher in the topbar
   deep-links to each page's real counterpart. **Recommended before
   this goes live**: a native Arabic speaker should review the
   translated copy — particularly the transliteration of personal names
   (e.g. "Zakaria Olanrewaju Anofi" → زكريا أولانريواجو أنوفي, and the
   ~17 names in the governance ledger) and the Islamic terminology on
   the Royal College and Policies pages — per the translator's note
   still shown on `/ar/`.
3. **What's actually missing** — term dates, fee schedule, scholarship
   criteria — needs to come from SULTAN before those sections can be
   written honestly.

This bible will be extended as those decisions are made and as real data
arrives to retire the remaining placeholders.
