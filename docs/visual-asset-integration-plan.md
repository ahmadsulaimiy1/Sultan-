# Visual Asset Integration Plan — First Photography Batch

**Prepared per:** the Visual Asset Integration Directive.
**Scope:** 11 photographs supplied in this batch. This document records,
for every image, its purpose, its recommended placement (or the reason
it is being held rather than placed), and the rationale — per the
directive's own instruction to document every recommended placement,
not just implement silently.

**Headline finding:** before this batch, `pages/*.html` contained
**zero real photographs** — every page uses only the crest logo. That
is very likely a real contributor to the "flat visual design, no visual
storytelling" critique raised separately. This batch is a first, honest
step toward fixing that — not a complete solution, since only 5 of the
11 supplied images are usable on the public site today.

---

## Images approved and integrated (5)

| # | File | Description | Placement | Rationale |
|---|---|---|---|---|
| 1 | `campus-gate.jpg` (was `61a7ff70…`) | Front gate and boundary wall, `shroyalschools.ng` signage, daylight, no people | Facilities page — new "Campus in Pictures" gallery, lead image | Clean, well-composed exterior shot; a real gate photo does more for "is this a real place" credibility than any amount of copy. No identifiable individuals — no consent question. |
| 2 | `campus-building.jpg` (was `9e04d012…`) | Main building facade, "Sultan Hanafi Royal Schools" signage, low/tilted angle | Facilities page gallery | Strong brand-confirming shot (the actual sign, in Arabic and English, on the actual building). The tilted horizon is a real quality flaw — flagged below, not hidden — but the image is still usable at gallery-thumbnail size where the tilt reads as intentional low-angle framing rather than an error. |
| 3 | `biology-laboratory.jpg` (was `dfe800db…`) | Biology lab: skeleton model, anatomical wall charts, microscopes, specimens, organised benches, no people | Facilities page gallery, captioned "Biology Laboratory" | Directly matches an existing named row in the Facilities index (`Biology Laboratory`) that has never had a photo. Well-lit, tidy, genuinely well-equipped — this is exactly the kind of image that converts a skeptical parent. |
| 4 | `chemistry-laboratory.jpg` (was `127c97cf…`) | Chemistry lab: periodic table poster, reagent bottles, glassware, fume-extraction rig, no people | Facilities page gallery, captioned "Chemistry Laboratory" | Matches the `Chemistry Laboratory` row. Usable but not pristine — see quality flag below. |
| 5 | `boarding-dining.jpg` (was `2be7f3ad…`) | Boarding house kitchen/dining area, table set with plates and mugs, kitchen equipment, no people | Facilities page gallery, captioned "Boarding Dining Area" | The Boarding page (`pages/boarding.html`) currently has zero photography and a fixed two-column layout that isn't a safe place to insert an image without a broader layout change (out of scope for this pass — see Deferred, below). Placing it in the Facilities gallery instead still delivers the credibility value without touching a layout this pass didn't plan to redesign. |

All five: resized to a 1400px-wide JPEG (down from the original
2248×1500 handset-camera source), quality 80, progressive encoding —
150–205KB each, so the added gallery does not meaningfully slow the
page. Each has real alt text (not the filename) and a real caption
matching this table. Lazy-loaded (`loading="lazy"`) except the lead
image. Grid is responsive: multi-column on desktop, single column on
mobile, consistent aspect ratio via `object-fit: cover` so the layout
doesn't jump when images of different source proportions are mixed.

## Images held — quality flags, not placed (2)

| # | File | Description | Why held |
|---|---|---|---|
| 6 | `83a45446…` | A room mid-fit-out: paint buckets, loose tools, an empty half-built shelf unit, unconnected electrical wiring visible | This does not read as "Basic Technology Workshop" (the Facilities index row it would nominally illustrate) — it reads as a room still being set up. Publishing it would undercut credibility rather than build it. Recommend a reshoot once the room is actually in teaching-ready condition. |
| 7 | `ec7b10e9…` | A second workshop-in-progress shot: tools scattered on a bare-wood bench, shovels leaned against a wall, blank whiteboard | Same issue as #6, different angle of what looks like the same room. Held for the same reason. |

Per the directive's own instruction — *"Where a visual asset is weak,
low quality, outdated, duplicated, or inconsistent with the
institutional brand, flag it rather than forcing its inclusion"* —
these two are flagged, not placed. The objective is credibility, and a
half-finished room photographed as if it were a finished facility would
work against that.

## Images held — identity/consent not yet confirmed (1)

| # | File | Description | Why held |
|---|---|---|---|
| 8 | `52b1849e…` (adult, kufi + agbada, car interior selfie) | A single adult male, informal selfie taken inside a vehicle | Two open questions, not one: **(a)** this project has not been told who this is (a staff member? the CEO? a board member?) or in what capacity they'd be represented — I'm not going to guess a name or title onto a real person's photo. **(b)** even once identity is confirmed, a car-interior selfie is not a professional headshot — SHRS's Leadership/Faculty pages (`about-governance.html`) currently use no photos at all, and the first photo added there should be a proper portrait, not a casual selfie, to match the institutional register of the rest of the site. Recommend: confirm identity and role, and source (or schedule) a proper headshot, rather than publish this image as-is. |

## Images held — safeguarding/consent (2)

This is the most important flag in this document, and it follows
directly from governance work this same project already completed.

| # | File | Description | Why held |
|---|---|---|---|
| 9 | `7aad3ae2…` | A group of students on a stairwell, each holding a **handwritten card showing their full name** (visible and legible), faces clearly visible | This photo pairs an identifiable child's face directly with their full legal name, in a single public-facing image. That is precisely the combination the Child Protection & Safeguarding Policy (SW-01) and the Data Protection & Privacy Policy (IT-02) — both already published on this site — exist to protect: the child-specific consideration in SW-01 §7.8, and IT-02's principle that a child's data (a photo *is* personal data) is collected and shared only for a stated, legitimate purpose with appropriate consent. **This looks like an internal registration/ID-verification photo, not a marketing photo, and it should not be published to the public website in this form regardless of consent status** — even with consent, the name-cards should be cropped out or blurred before any public use. |
| 10 | `54c1eaa2…` | A classroom of students, hands raised, faces clearly visible, no names visible | No name/face pairing (safer than #9), but still identifiable minors on a public page. **No record exists anywhere in this project's governance library of a parental/guardian image-consent process** — the Admissions Policy, Data Protection & Privacy Policy, and Child Protection & Safeguarding Policy all cover what data is collected and how it's protected, but none of them currently address photography/image consent for public-facing use. That is a genuine, newly-surfaced gap, not an oversight in this specific decision. |
| 11 | `31c0a269…` | Five students displaying medals at the "SPELL Africa International Spelling Leaders Competition," a public competitive event with a visible event banner; contestant badges show **numbers only** (459, 296, 331, 410), not names | The safest of the three people-photos — no names visible, and competition photography is commonly covered by an event's own media consent at registration. But this project cannot confirm that consent was obtained, by whom, or for what use (event promotion vs. this school's own website is not automatically the same permission). Held pending that confirmation, not on quality grounds — this is otherwise a strong, genuine achievement photo that would do real work for trust and social proof once cleared. |

**Recommendation, not just a hold:** SHRS should adopt a short,
explicit photography/image-consent practice — even a single paragraph
in the Admissions Policy or a new short policy — stating that guardians
are asked at enrolment whether their child's image may be used in
school publications/website/social media, with a record kept per child.
This is a real governance gap this photo batch surfaced, not something
this drafting pass should quietly patch by inventing a consent record
that doesn't exist. Flagging it here for the same reason every other
"needs real-world input" item in this project's governance library has
been flagged rather than guessed at.

## Deferred (not a flag — genuinely out of scope this pass)

- **Homepage hero imagery.** The homepage (`pages/home.html`) currently
  shows only the crest, consistent with the deferred visual/prestige
  redesign already on record as open from an earlier directive. Adding
  a photographic hero to the homepage is a layout decision that
  belongs with that redesign, not slipped in piecemeal here.
- **Boarding page.** As noted above, its fixed two-column grid has no
  safe image slot without a layout change — deferred rather than forced.
- **Faculty/Leadership photography** on `about-governance.html` — blocked
  on image #8's open identity question, and more broadly, that page
  would need a full staff-photo set (or a firm decision to add photos
  incrementally as they become available), not a single photo of one
  unconfirmed individual.

## Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | Draft | Initial plan, first photography batch (11 images: 5 placed, 6 held) | Not yet reviewed |
