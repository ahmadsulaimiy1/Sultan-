# Sultan Hanafi Royal Schools — the institutional identity

The standard the school's documents are held to, and the reason behind
every decision in it. One identity, not a set of options.

`brand/build.py` is this document made executable; `brand/render.py`
measures the sheet against §X and exits non-zero if it has drifted. Where
the two disagree, the measurement is right and this document is wrong.

---

## I. What a document from this house is for

A letter, a certificate and a transcript are all the same act: **the
school asserting, before a word is read, that this document is authentic
and that an institution stands behind it.** Everything below serves that
assertion or it does not belong.

Three consequences settle most arguments:

1. **The content is the hero; the sheet is the frame.** Stationery that
   competes with its own text has failed, however beautiful.
2. **Authority is shown by precision, not by quantity.** A passport, a
   banknote, a university degree: none of them are busy. Cheap documents
   are busy *because* they cannot afford to be exact.
3. **Every mark must be true.** A document is evidence. An ornament may
   be invented; a fact, a seal, an endorsement or an approval may not.

## II. The Quarter — the structural signature

The identity's one structural idea. Not decoration, not ornament, not
pattern: a proportion taken from the paper itself.

ISO 216 is built on √2 so that halving a sheet preserves its shape. On A4
the arithmetic is exact:

```
297 ÷ √2 = 210.000    the sheet's height over root two
                      is the sheet's own width
210 ÷ √2 = 148.492
```

**The Quarter is a rule standing at W/√2, descending from the top edge to
a depth of H/√2.** Two things follow, and both can be checked with a
ruler:

- it encloses an upper-left rectangle of 148.5 × 210mm — **an A5 sheet
  standing in the corner of the A4**;
- **its length equals the sheet's width.**

It holds at every ISO size, because the ratio is the paper's, not ours:

| Sheet | Rule stands at | Rule runs |
|---|---|---|
| A3 297 × 420 | 210.0mm | 297mm |
| **A4 210 × 297** | **148.5mm** | **210mm** |
| A5 148 × 210 | 105.0mm | 148.5mm |
| A6 105 × 148 | 74.2mm | 105mm |

A second rule — the **head rule** — crosses the sheet at H/9 × 2 and
**stops dead on the Quarter**. That right angle at (148.5, 46.7) is the
mark. Someone shown only the top-right corner of a sheet can identify the
house from it.

**The crest is quartered; so is the sheet.** The two rules are the two
strokes of that quartering, and they are the only two rules on the page.
This is why the signature is not arbitrary: it is the school's own
heraldry restated in the geometry of the paper.

### Why a signature and not an ornament

An ornament is a picture somebody drew. A signature is a rule anybody can
reproduce and everybody can verify. The Quarter can be redrawn on any
sheet, at any size, in any medium — a certificate, an ID card, a sign, a
web page — by one instruction: *root two across, root two down.* That
portability is the whole point of the requirement that it work on
letterheads, certificates, transcripts, records, cards, books, sites,
apps, signage and graduation material alike.

### The Quarter on other surfaces

The rule is the same instruction everywhere; only what sits either side
of it changes.

| Surface | The Quarter | Left of it | Right of it |
|---|---|---|---|
| Letterhead | 148.5mm, running 210mm | the institution speaks | the document identifies itself |
| Certificate | same, rule inverted to descend from the foot | the award | seal, number, verification |
| Transcript | same | the record of study | issue, page, authentication |
| ID card (ISO ID-1) | 85.6/√2 = 60.5mm | portrait and name | number, office, expiry |
| Web and app | 70.71% of the content measure | content | metadata rail |
| Signage | 70.71% of the sign's width | name | wayfinding |

**Nothing institutional ever crosses the Quarter.** That single
prohibition is what makes the field on the right read as a deliberate
margin of record rather than as leftover space. It is tested (§X.5).

## III. The page — margins and fields

The margin module is **one ninth of the sheet's width**: 210 ÷ 9 =
23.333mm. The ninth is not invented here — it is the division behind the
Van de Graaf canon, the "secret canon" reconstructed from medieval
manuscripts and incunabula, whose margins of 1/9 and 2/9 place a text
area in the page's own proportion. Its famously deep foot is exactly
where an institution's record belongs.

```
                    ┌──────────────────┬────────────┐
  7.8mm             │  crest  wordmark │            │
                    │         Arabic   │            │
  46.7mm  head rule ├──────────────────┤            │  ← stops on the Quarter
  54.4mm            │  roll of house   │  place of  │
                    │                  │  issue     │
  70.0mm            │                  │            │
                    │      THE TEXT    │            │
                    │                  │            │
  210.0mm           │                  ╵            │  ← the Quarter ends
  221.7mm           │                  │            │
  233.3mm           ├──────────────────┤  sheet no. │  ← record rule
                    │  motto           │            │
                    │  contacts        │            │
                    │  verification    │            │
                    └──────────────────┴────────────┘
```

Left of the Quarter, **the institution speaks**. Right of it, **the
document identifies itself** — place of issue at the head, sheet number
at the foot, and nothing else, ever. That is the whole information
architecture, and it is why the right field is calm rather than empty.

**The record is not a footer.** It is where an institution states where
it is found and how its documents may be checked. It sits on ivory under
one gold rule, with no band behind it: a second mass of colour would
argue with the masthead, and the record's authority is in its precision,
not its weight.

## IV. Colour

The palette is fixed: **coffee, royal gold, warm ivory, cream.**

| Token | Value | Use |
|---|---|---|
| Coffee 900 | `#1C1409` | the wordmark |
| Coffee 800 | `#2A1F12` | subject lines |
| Coffee 700 | `#3B2C19` | the Arabic name, drop initial, motto |
| Coffee 600 | `#4E3B22` | secondary and small caps |
| Ink | `#241A0E` | body text |
| Gold (foil) | `#B08D45` | the two rules — struck, not read |
| Gold (ink) | `#856327` | printed labels — read, not struck |
| Ivory | `#FCF9F2` | the sheet |
| Cream | `#F1E7D4` | reserved |

**Brown and gold are neighbours on the colour wheel**, which is the
standing objection to a coffee-and-gold house: gold laid on brown goes
muddy because the two are close in hue. The answer is not to abandon the
palette but to **separate by luminance instead of by hue** — take the
coffee down to near-espresso and keep the gold light. That is also how
foil behaves physically: it is bright because it reflects, and it reads
against a dark ground for the same reason.

**Foil gold and printed gold are two different values, and always were.**
Foil is specular, so it can be light and still read. Printed gold ink
does not reflect, so it must be darker to hold legibility — `#856327`
reaches 5.3:1 on ivory, where the foil value reaches only 3.0:1. Using
one value for both is the commonest way a gold identity fails on a laser
printer. Gold is an accent; it is never a reading colour (§X.11).

**The sheet is plain white or ivory stock.** A tint is the paper's job,
not the printer's: a full-bleed ground costs ink on every page and rarely
reproduces the way it looks on screen.

## V. Production — designed for the press it will be made on

The identity assumes cotton archival stock, hot foil, blind embossing,
letterpress and precision offset. That assumption is only honest if the
artwork can actually be made, so the constraints are numbers, not
adjectives.

**A brass foil die needs a minimum line of 0.2–0.3mm and a minimum type
size of 7–8pt.** Below that the foil breaks off the shoulder of the die
and the line drops out. Therefore:

- **Every gold rule is 0.3mm** — drawn at the width it will be struck.
- **Every gold element is ≥ 7pt.**
- **No gold element is graduated.** Foil is binary: a die either strikes
  or it does not, so a fade is a thing that can be drawn and never made.

This is enforced, not intended (§X.6).

**It is also why this identity carries no guilloche and no microtext.**
Both were in the previous system; both were drawn at 0.45pt and 2pt,
which no die will hold. An ornament that cannot be manufactured is a
picture of an ornament. Removing them was not a loss of richness but the
removal of two things that could never have been made.

## VI. Typography

Two faces. Each has a reason, and there is no third.

**EB Garamond** — a revival of the 1592 Egenolff–Berner specimen, which
shows Claude Garamont's roman beside Robert Granjon's italic. It is the
lineage of the scholarly press, and it is the reason the motto is set in
italic: that italic is Granjon's, and it is the one voice on the sheet
where the school speaks about itself. Variable, 400–800, so weight is
chosen optically rather than picked from a menu.

**Amiri** — Khaled Hosny's revival of the Bulaq (al-Maṭbaʿa
al-Amīriyya) naskh of 1905, the face of the 1924 Cairo Qur'an certified
by al-Azhar. For a house that keeps a Qur'an College this is provenance,
not styling: the Arabic on the sheet descends from the press that set the
Qur'an the school teaches.

Both are open-licensed, so both are embedded in the artwork and neither
depends on a font being installed anywhere.

| Role | Face | Size | Treatment |
|---|---|---|---|
| Wordmark | EB Garamond 500 | 16.5pt | caps, 0.132em, on two **placed** lines |
| Arabic name | Amiri 400 | 13.6pt | optically matched to the cap (§VII) |
| Roll of the house | EB Garamond 400 | 6.8pt | caps, 0.1em, two placed lines |
| Place of issue | EB Garamond 400/600 | 6.4pt | caps, 0.11em |
| Subject | EB Garamond 600 | 10.5pt | caps, 0.09em |
| Body | EB Garamond 400 | 10.5pt / 1.62 | justified, hyphenated |
| Motto | EB Garamond italic | 11pt | Granjon's italic |
| Labels | EB Garamond 400 | 7pt | caps, 0.2em, gold ink |

**A wordmark that reflows at a different width is two wordmarks.** Every
break in the identity — wordmark, roll of the house, verification line —
is *placed*, never left to the box. Tracking carries the ceremony: 0.132em
on the wordmark does more for authority than any ornament, and costs
nothing.

## VII. The bilingual lock-up

The requirement is that the two scripts read as **one identity, not two
languages set beside each other.** That is a measurable claim, so it is
measured.

Latin and Arabic have no common vertical metric — cap height, x-height
and the naskh baseline are unrelated quantities, which is why bilingual
lock-ups usually look like two marks stapled together. The rule here:

> **The height of the alif equals the cap height of the Latin.**

Both scripts then sit on one optical line, share one left edge, and read
as a single mark. At 16.5pt EB Garamond against 13.6pt Amiri the ratio
measures **1.000** (§X.7). If either size changes, the test fails and the
other must be re-derived — the constant is not a preference.

## VIII. Rules that are not negotiable

0. **The Arabic name is مدارس السلطان حنفي الملكية** — plural, with the
   article, as the school's own Arabic pages set it. The singular names
   one school; this house has five.
1. **The wordmark never reflows.** Its two lines are placed.
2. **Nothing institutional crosses the Quarter.**
3. **The record sits inside its sheet, on every sheet.**
4. **A letter is never condensed to fit.** If it runs to seven sheets it
   runs to seven sheets. Re-paginate at a change of subject; never trim a
   fact to save a line, and never let a section heading strand at the
   foot of a sheet with a single item under it.
5. **Continuation sheets keep the Quarter and drop the lock-up.**
   The signature identifies the sheet; repeating the full masthead is
   what a template does, not an institution.
6. **No placeholder a person must fill by hand** where the system already
   holds the value.
7. **No gold element that a die could not strike** (§V).

## IX. What may never appear

Stated because they have been asked for, and because a document is
evidence:

- **The Coat of Arms of the Federal Republic of Nigeria.** It is the mark
  of the Federal Government, protected under the Flags and Coat of Arms
  Act. On a private school's stationery it asserts that the document
  issues from the State. The school's own crest is the correct and
  sufficient mark of authority.
- **"Approved by the Lagos State Ministry of Education", or any
  ministry, board or examination-body mark**, unless the school holds
  that approval and supplies its number, which is then printed *with* the
  number. A claim of approval on a letterhead is a claim made to every
  parent who receives one.
- **Any award, ranking, affiliation or partner mark** not evidenced.

What is legitimate, and present: **Ikorodu · Lagos State · Federal
Republic of Nigeria** — a statement of where the school is, which is
true, carries the geographic dignity, and claims nothing.

## X. Acceptance tests

A sheet ships only when all of these pass, measured — never eyeballed.
They are executable, which is the only version of "measured" that
survives a second author:

```
python3 brand/render.py        builds, prints both PDFs, cuts the art the
                               Word template carries, and measures every
                               test below. Exits non-zero on any failure.
python3 brand/build_docx.py    builds the Word template and checks its
                               structure and geometry.
```

| # | Test |
|---|---|
| 0 | Both faces load; no console errors |
| 1 | The page measures 794 × 1123 px (A4 at 96dpi) |
| 2 | The Quarter stands at W/√2 |
| 3 | The Quarter runs H/√2, which equals the sheet's width |
| 4 | The head rule closes on the Quarter |
| 5 | Nothing institutional crosses the Quarter |
| 6 | Every gold element is strikeable — rules ≥ 0.3mm, type ≥ 7pt |
| 7 | The alif matches the Latin cap within 5% |
| 8 | No prose is clipped by its sheet |
| 9 | The record sits inside every sheet |
| 10 | Body ink ≥ 12:1 on paper at its lightest |
| 11 | Gold labels ≥ 4.5:1 on paper — gold is never a reading colour |
| 12 | No unfilled placeholder |
| 13 | The letter begins on sheet one |
| 14 | The lock-up appears on sheet one only |
| 15 | Exactly one drop initial, on the opening sentence |

Test 8 exists because the sheet is `overflow:hidden`: prose that does not
fit is silently cut off rather than pushing the record out, so the record
test alone would never see a lost final paragraph.

## XI. What this identity replaced, and why

The previous system was **garnet** — deep oxblood with gold — chosen in
an earlier revision on the reasoning that oxblood is the register of
charters and holds gold better than brown does. That reasoning was sound
about hue and wrong about the remedy: the coffee palette is the school's,
and the gold-on-brown problem is solved by separating the two in
luminance (§IV) rather than by changing the school's colour.

Three other things went with it, each for a stated reason:

- **The guilloche and the microtext** — neither could be foiled at
  0.45pt and 2pt (§V).
- **The five contact icons** — line icons at a footer are the convention
  of a template marketplace, not of a chancery. Contact details are
  labelled in tracked small caps, which is the fine-press convention and
  needs no artwork.
- **The full-bleed masthead band** — a solid colour block across the head
  of a sheet is the most recognisable convention of online template
  design. It also prints badly on cotton stock, where large solids
  mottle, and it competes with foil. The paper is now the field, which is
  how a chancery sheet has always worked.
