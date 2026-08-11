# The Full Menu — Editorial Bible

**Status: draft for the school's approval. Nothing in it has been built.**

Three attempts at this menu have now been rejected, and each was rejected for
a different reason. That is a sign that it was being *decorated* rather than
*designed*, so this document sets the standard before any more code is
written. It is the thing to argue with. Once it is signed off, building it is
mechanical.

---

## 0. A note on how the references were studied

This environment has no outbound network access — every request to an external
host is refused, and that was verified rather than assumed. So the references
below are not screenshots taken this week. They are the settled conventions of
a well-documented genre: the navigation used by international hotel groups,
couture houses, and the older British and Swiss schools.

**If the school wants this grounded in specific live examples, send four or
five URLs you admire and I will work from those instead.** That would be
better than working from convention, and it is a five-minute change to this
document.

---

## 1. What actually makes a menu read as expensive

The three failed attempts each broke the same law from a different direction.

| Attempt | What it was | Why it failed |
|---|---|---|
| v5 — espresso drawer | 500px column, nine collapsible sections | A filing cabinet. To compare two things you had to open, read, close, open. |
| v6 — ivory drawer | The same column, repainted | Same shape, so the same fault. Rated 3/10. |
| v7 — three-column index | Everything visible on cream | A sitemap on beige. No depth, no hierarchy, one type size throughout. Rated 1/10. |
| v8 — photographic plate + pills | Image beside forty pill buttons | Busier still. Forty boxes is forty decisions. |

The law all four broke:

> **Luxury is subtraction. A prestige menu is defined by how little it shows,
> not how much it can fit.**

Everything below follows from that.

### The five properties the genre shares

1. **Few doors.** Five to seven primary entries. Never nine, never eleven. The
   menu is not the sitemap; the footer is the sitemap.
2. **One column, large type.** The primary entries are a vertical list set in
   the display face at 32–52px, one per line, generous leading. Not a grid.
   Grids are for catalogues.
3. **Air is the material.** Somewhere between half and two-thirds of the sheet
   is empty. Emptiness is the single most expensive thing on a page, because
   it is the thing a cheap site cannot afford to leave.
4. **Depth on demand, not on arrival.** Sub-pages appear in a second column
   when a primary entry is chosen, or they do not appear at all. Nothing
   descends more than one level.
5. **One accent, used once.** A single hairline rule, a single metal. Not a
   gold rule *and* gold pills *and* gold numerals *and* a gold plate.

### What the genre never does

- Buttons for navigation links. A link is a word.
- A description under every entry. If a name needs explaining, the name is wrong.
- More than one call to action.
- Contact details, opening hours, or social icons inside the primary menu.
- Two typefaces fighting at the same size.
- Cards, tiles, pills, chips, boxes, or panels with borders.

---

## 2. The rules for this menu

### 2.1 Structure

The menu is a **full-viewport overlay**, not a drawer. It has three zones and
nothing else:

```
┌───────────────────────────────────────────────────────────────┐
│  crest · SULTAN HANAFI ROYAL SCHOOLS                     ✕     │   ZONE A  head
│                                                                │
│                                                                │
│    I    Our School                     ┌─────────────────┐     │   ZONE B  index
│    II   Academics                      │                 │     │
│    III  Admissions                     │   one still     │     │
│    IV   Student Life                   │   photograph    │     │
│    V    The Digital Campus             │                 │     │
│    VI   Contact                        └─────────────────┘     │
│                                                                │
│                                                                │
│  Login to Portal          EN · AR · YO · FR      Verify        │   ZONE C  foot
└───────────────────────────────────────────────────────────────┘
```

**Zone A — the head.** Crest, the school's name, the close control. Nothing
else. Fixed; never scrolls over content.

**Zone B — the index.** Six primary entries, one per line, Roman numeral in
the margin. Choosing one replaces the photograph with that division's
sub-pages, set small and quiet beneath the entry — *in place*, without the
list moving. This is the only interaction the menu has.

**Zone C — the foot.** Three items on one line, in small caps: the way into
the portal, the language switch, and verification. No telephone number, no
email, no WhatsApp — those belong to the footer and the contact page.

### 2.2 Information architecture — the six doors

Nine divisions is a sitemap. Six is a menu. Proposed:

| № | Door | What sits beneath it |
|---|---|---|
| I | **Our School** | Our Story · Governance & Leadership · The Foundation · Campus & Facilities · Gallery · Media Centre |
| II | **Academics** | The five institutions · Curriculum · Faculty · The Digital Qur'ān Centre |
| III | **Admission** | How to apply · Create an account · Begin an application · Academic Calendar |
| IV | **Student Life** | Student Life Hub · Boarding · Clubs & Competitions |
| V | **The Digital Campus** | Overview · Portal Access · Marketplace · Online Courses · Verify a Credential |
| VI | **Contact** | Contact the school · Notices · Visit us |

Everything currently in the menu still has a home. Nothing is deleted; three
divisions are folded into their natural parents.

**This table is the part most worth arguing with.** If the school would rather
Admission stood first, or the Foundation had its own door, say so — it is a
one-line change here and a five-minute change in the build.

### 2.3 Typography

| Element | Face | Size | Tracking | Colour |
|---|---|---|---|---|
| Primary entry | Cormorant Garamond 600 | `clamp(2rem, 4.2vw, 3.25rem)` | −0.005em | ink |
| Roman numeral | Cinzel 500 | 0.68rem | 0.14em | gold, 55% |
| Sub-page | Inter 500 | 0.92rem | 0 | ink at 72% |
| Foot items | Cinzel 600 | 0.68rem | 0.18em | gold-deep |
| School name (head) | Cormorant Garamond 600 | 1.1rem | 0.01em | ink |

One display face, one label face, one text face. **Nothing else may be added.**

Leading on the primary entries is 1.25. The gap between entries is `1.1em` —
they must read as a list of six, not a stack of blocks.

### 2.4 Colour

The sheet is ivory in every edition. It does not follow the reader's chosen
edition, because a reader with the menu open is not looking at the page.

```
paper      #FBF7EF   the ground, flat — no gradient
ink        #2C2118   primary entries, the school's name
ink-2      #6B5B45   sub-pages, the foot
gold       #A98443   numerals, rules, the hovered state
gold-deep  #63481B   the foot's labels
```

**Five values. No sixth.** Every one stated as a literal, never as a livery
token — a livery token is a colour that follows the edition, and this sheet
does not. That mistake has now been made twice and measured twice
(1.85:1 and 1.98:1), both times through a rule that named a dark colour.

There is no gradient on the sheet, no watermark, no radial glow. The paper is
flat. Depth comes from the photograph and from air, not from lighting effects.

### 2.5 The photograph

**One** photograph, on the trailing third, with a 3:4 crop and a hairline gold
frame. It is a still: no Ken Burns, no parallax.

It changes only when a primary entry is opened, and it cross-fades over 700ms.
It is never busy — a corridor, a courtyard, a room with no one looking at the
camera. If the school has no photograph fit for a given division, that
division keeps the previous one; the menu never shows a poor picture to fill a
slot.

### 2.6 Motion

| What | How long | Curve |
|---|---|---|
| The sheet arriving | 480ms opacity only | `cubic-bezier(.16,.8,.24,1)` |
| A rule drawing under an entry | 420ms scaleX | same |
| The photograph cross-fading | 700ms opacity | ease |
| Anything else | — | there is nothing else |

No slide, no scale, no bounce, no stagger. Reduced-motion turns all of it into
a 200ms opacity change.

### 2.7 States, and what the pointer does

- **Rest.** Entry in ink, numeral in gold at 55%.
- **Hover / focus.** The entry moves to gold-deep and a hairline rule draws
  from the leading edge to the width of the word. Nothing dims, nothing
  scales, nothing moves position.
- **Open.** The entry stays gold-deep, its rule stays drawn, and its
  sub-pages fade in beneath it over 300ms. Only one may be open.

Dimming the other entries — as v8 did — is theatrical and makes the menu
harder to scan. It is forbidden.

### 2.8 The rules that are not about looks

- Escape closes it; the close control closes it; the ground outside the sheet
  closes it. Focus returns to the control that opened it.
- Focus is trapped inside the sheet while it is open.
- When it is shut it is out of the tab order — `visibility:hidden`, not
  `pointer-events:none`.
- Every ink is measured against **painted pixels** in all three editions
  before it is called finished. Not computed styles. Not assumptions.
- It mirrors for Arabic: the photograph moves to the leading edge, the rules
  reverse, the numerals stay Roman.
- Every string comes from `i18n/*.json`. No English is hard-coded.

---

## 3. Acceptance tests

The build is not finished until all of these pass, and each is checked, not
asserted:

1. Six primary entries. Not seven.
2. At 1440×900 with nothing open, **more than half the sheet is empty**.
3. Total element count inside the sheet is under 90. (v8 had 214.)
4. Zero contrast failures across three editions, measured from screenshots.
5. Zero horizontal overflow at 1440, 1024, 768 and 390.
6. Opens and closes by keyboard alone; focus never leaves the sheet.
7. Arabic mirrors correctly and no string is left in English.
8. The whole sheet uses five colours, one gold, one hairline weight.
9. Nothing in the sheet is a button except the close control and the portal
   entry in the foot.
10. No page in the site loses a link that the menu previously offered.

---

## 4. What I need from the school before building

1. **Approve or amend the six doors** in §2.2. That is the one decision only
   the school can make.
2. **Four or five URLs** whose menus you admire, if you have them — I cannot
   reach the web from here, and working from your examples beats working from
   convention.
3. **Confirm the foot** carries only Portal, Language and Verify — and that
   the telephone number and WhatsApp move out of the menu and stay in the
   footer, where they already are.

With those three answers this is a single, contained build, and it will be
measured against §3 before it is shown.
