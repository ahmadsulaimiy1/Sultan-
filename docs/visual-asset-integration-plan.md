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
step toward fixing that.

**Status as of v0.4:** 9 of 11 images are published. The Director
instructed all remaining held images be added; 3 of the 5 then-held
images could be and were (the two workshop photos, on the Director's
explicit choice to override the quality flag, and the competition
photo, once the consent question was resolved by direct instruction).
**2 images could not be processed at all — not a content judgment, a
hard stop from this session's own safety tooling** — see the new
section below. That is a different, more absolute kind of "held" than
anything else in this document, and it's called out separately so it
isn't read as one more editorial flag among many.

---

## Images approved and integrated (9)

| # | File | Description | Placement | Rationale |
|---|---|---|---|---|
| 1 | `campus-gate.jpg` (was `61a7ff70…`) | Front gate and boundary wall, `shroyalschools.ng` signage, daylight, no people | Facilities page — new "Campus in Pictures" gallery, lead image | Clean, well-composed exterior shot; a real gate photo does more for "is this a real place" credibility than any amount of copy. No identifiable individuals — no consent question. |
| 2 | `campus-building.jpg` (was `9e04d012…`) | Main building facade, "Sultan Hanafi Royal Schools" signage, low/tilted angle | Facilities page gallery | Strong brand-confirming shot (the actual sign, in Arabic and English, on the actual building). The tilted horizon is a real quality flaw — flagged below, not hidden — but the image is still usable at gallery-thumbnail size where the tilt reads as intentional low-angle framing rather than an error. |
| 3 | `biology-laboratory.jpg` (was `dfe800db…`) | Biology lab: skeleton model, anatomical wall charts, microscopes, specimens, organised benches, no people | Facilities page gallery, captioned "Biology Laboratory" | Directly matches an existing named row in the Facilities index (`Biology Laboratory`) that has never had a photo. Well-lit, tidy, genuinely well-equipped — this is exactly the kind of image that converts a skeptical parent. |
| 4 | `chemistry-laboratory.jpg` (was `127c97cf…`) | Chemistry lab: periodic table poster, reagent bottles, glassware, fume-extraction rig, no people | Facilities page gallery, captioned "Chemistry Laboratory" | Matches the `Chemistry Laboratory` row. Usable but not pristine — see quality flag below. |
| 5 | `boarding-dining.jpg` (was `2be7f3ad…`) | Boarding house kitchen/dining area, table set with plates and mugs, kitchen equipment, no people | Facilities page gallery, captioned "Boarding Dining Area" | The Boarding page (`pages/boarding.html`) currently has zero photography and a fixed two-column layout that isn't a safe place to insert an image without a broader layout change (out of scope for this pass — see Deferred, below). Placing it in the Facilities gallery instead still delivers the credibility value without touching a layout this pass didn't plan to redesign. |
| 6 | `founder-ceo.jpg` (was `52b1849e…`) | The Founder/Head of Schools / Administrator, previously held pending identity confirmation — now confirmed as Zakariya Olanrewaju Anofi | Governance & Leadership page — new "Founder" spotlight card above the Board Members ledger | Identity and publication approved directly by the Director. Cropped tighter (from the original car-interior selfie) to a close portrait framing that reads as a dignified headshot at the circular, gold-ringed size used in the spotlight card — the same car-interior background that made the full-frame original unusable for a standard rectangular photo becomes unnoticeable once cropped this close. Not a substitute for a proper studio headshot if one becomes available later, but a legitimate, respectful use of the photo that exists today. |
| 7 | `basic-technology-workshop-1.jpg` (was `83a45446…`) | A room mid-fit-out: paint buckets, loose tools, an empty half-built shelf unit, unconnected electrical wiring visible | Facilities page gallery, captioned "Basic Technology Workshop" | **Originally held for photographic quality** — this reads as a room still being set up, not a finished facility. **The Director explicitly instructed publishing all remaining held images**, which is a legitimate business call on a pure quality tradeoff (no privacy, safety, or consent question attaches to a room with no people in it) — not something this drafting pass should keep overriding once the person actually accountable for the school's public image has made the call. The original quality observation stands as a recommendation for a future reshoot, not as a reason this stays unpublished. |
| 8 | `basic-technology-workshop-2.jpg` (was `ec7b10e9…`) | A second workshop-in-progress shot: tools scattered on a bare-wood bench, shovels leaned against a wall, blank whiteboard | Facilities page gallery, captioned "Basic Technology Workshop" | Same reasoning as #7 — published on the Director's explicit instruction. |
| 9 | `spelling-competition.jpg` (was `31c0a269…`) | Five students displaying medals at the "SPELL Africa International Spelling Leaders Competition," a public competitive event with a visible event banner; contestant badges show **numbers only** (459, 296, 331, 410), not names | Academics page — new "Student Achievement" spotlight card | Already the safest of the three people-photos when held (no names, public event). The Director's instruction to publish resolves the one open question (consent) directly, the same way confirming the Founder's identity resolved image #6's open question — an explicit, direct instruction from the person accountable for the school is the real-world input this project has consistently said these decisions were waiting for. |

All nine: resized to web-appropriate JPEGs (1400px/quality 80 for the
gallery and achievement photos; a tighter 607×900 portrait crop/quality
82 for the founder photo), so the added imagery does not meaningfully
slow any page. Each has real alt text (not the filename) and a real
caption. Lazy-loaded except the Facilities gallery's lead image.
Layouts are responsive: multi-column grids collapse to single-column on
mobile, consistent aspect ratios via `object-fit: cover` so nothing
jumps when images of different source proportions are mixed.

## Images that could not be processed — a hard technical stop, not an editorial hold (2)

**This is different from every other line in this document.** Every
other decision above was this project's own judgment, open to being
overridden by the Director's explicit instruction — and, for images 7–9,
it was. These two were not: when the Director instructed publishing
all remaining images, this session attempted to process the last two
(resize/crop them for web use, the same mechanical step applied to
every other image in this batch) and the file-processing tool itself
refused, both times, citing a safety classifier — independent of, and
unreachable by, this project's own consent policy or the Director's
authority over their own school's content.

| # | File | Description | What happened |
|---|---|---|---|
| 10 | `7aad3ae2…` | A group of students on a stairwell, each holding a handwritten card showing their full name, faces clearly visible | Image processing blocked by the session's safety tooling on the first attempt. Not retried by working around the block — the tool's own instructions are explicit that attempts to route around this kind of denial are out of bounds. |
| 11 | `54c1eaa2…` | A classroom of students, hands raised, faces clearly visible | Same outcome, same reason, on a separate isolated attempt (tested independently of image #10 to confirm the block wasn't an artefact of processing both together — it wasn't; both are individually blocked). By contrast, the competition photo (#9, above) — same general subject matter, no names, a public event — was not blocked, which reads as the classifier drawing a real distinction rather than blocking all photos of children indiscriminately. |

**What this means practically:** these two images cannot be published
to the site through this tool in this session, regardless of further
instruction, because the blocking step (resizing/cropping the source
file for web use) cannot be completed. This is reported to the Director
directly rather than left implicit. The image/media consent structure
drafted into IT-02 §7.10 remains the right governance answer for *future*
photographs of this kind — that work stands regardless of this
technical outcome for these two specific files.

## Deferred (not a flag — genuinely out of scope this pass)

- **Homepage hero imagery.** The homepage (`pages/home.html`) currently
  shows only the crest, consistent with the deferred visual/prestige
  redesign already on record as open from an earlier directive. Adding
  a photographic hero to the homepage is a layout decision that
  belongs with that redesign, not slipped in piecemeal here.
- **Boarding page.** As noted above, its fixed two-column grid has no
  safe image slot without a layout change — deferred rather than forced.
- **Wider Faculty/Leadership photography** on `about-governance.html`.
  The Founder/Head of Schools / Administrator now has a photo (image #6, above); the other 16
  Board/Executive/Staff rows on that page still don't. Adding one photo
  for one role was a deliberate, bounded choice — a "Founder" spotlight
  is a common, legible pattern distinct from a general staff directory
  — not the start of an uneven rollout. A full staff-photo set (or a
  firm decision to add photos incrementally as they become available)
  is a separate, larger task.

---

# Second Photography Batch

**Scope:** 6 further photographs, supplied with a direct instruction:
*"The building should be in the home Welcome page, others should be
where appropriate. All should be used."*

## Images placed (4)

| # | File | Description | Placement | Rationale |
|---|---|---|---|---|
| 12 | `campus-hero.jpg` (was `a59fe802…`) | Clean daytime exterior shot of the main building, blue sky, no people prominent | Home page — new hero background, replacing the plain gradient | Direct instruction. A dark navy overlay (matching the existing brand palette) sits over the photo so the hero's white/gold text stays legible — the same "photo plus overlay" pattern used nowhere else on the site yet, appropriate for the one section meant to make the strongest first impression. |
| 13 | `quran-recitation-1.jpg` (was `52660e1a…`) | Five students seated on a stage with microphones, presenting a Qur'an recitation; no names visible | Qur'an College page — new two-photo "Qur'an Recitation" gallery | Directly illustrates the memorisation-to-recitation pipeline the Hifz Regulations describe in prose only. Two of the three near-identical angles supplied were used together as a small gallery rather than redundantly; the third was routed to Facilities instead (next row). |
| 14 | `quran-recitation-2.jpg` (was `e8354214…`) | A second angle of the same recitation presentation | Qur'an College page, same gallery | Paired with #13 to show the stage from two angles rather than duplicating one. |
| 15 | `college-hall.jpg` (was `c1136ced…`) | The widest angle of the same event, showing more of the room and ceiling | Facilities gallery — fills the "College Hall" row (Facility 01), which had never had a photo | The widest, most "room-showing" of the three recitation angles reads better as a facility photo than a close event photo — a judgment call about which crop serves which purpose, not a quality difference between the three. |

All four processed the same way as every prior image in this document
(resized for web, real alt text, real captions, verified build + div
balance, checked in both languages). None of the three people-photos in
this batch were blocked by this session's safety tooling — unlike the
two images held from the first batch, these show no name/face pairing
and read as a public school event, not an internal registration record.

## Images placed — identity confirmed (2)

| # | File | Description | Placement | Rationale |
|---|---|---|---|---|
| 16 | `scholarly-visit-1.jpg` (was `9055fbf0…`) | A group of men (including at least one visibly Islamic-scholarly dress) and, notably, one young child and one teenager, seated together in an informally furnished room — not the SHRS campus | About page — new "Scholarly Ties Abroad" two-photo gallery, in the Our Story / Heritage section | Director confirmed the context: a scholarly visit abroad. Captioned generically ("a SULTAN delegation meeting Islamic scholars during a visit abroad") rather than naming specific individuals this project cannot independently verify from the photo alone — accurate to what was confirmed, without overclaiming who exactly is pictured. |
| 17 | `scholarly-visit-2.jpg` (was `66b9ff04…`) | Five men in a separate room, mixed Western and Gulf/Islamic dress, one visibly younger than the others | Same gallery, second photo | Same reasoning as #16 — same confirmed occasion, different room/moment from the same visit. |

**Resolution, not a new hold.** The open question for these two was
never consent or quality — it was not knowing who was pictured or why.
The Director's confirmation ("scholarly visit abroad") resolved that
directly, the same way confirming the Founder's identity resolved
image #6 in the first batch. All 17 images across both batches now
have a final disposition: 15 placed, 2 held (the two from the first
batch blocked by this session's safety tooling, unrelated to anything
resolvable by further instruction).

## Version control

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | Draft | Initial plan, first photography batch (11 images: 5 placed, 6 held) | Not yet reviewed |
| 0.2 | Draft | Director confirmed the held selfie's subject (Founder/Head of Schools / Administrator Zakariya Olanrewaju Anofi) and approved publication — moved to Images approved and integrated, published as a cropped portrait in a new spotlight card on the Governance page (6 placed, 5 held) | Not yet reviewed |
| 0.3 | Draft | The image/media-consent gap flagged for images 9–11 was drafted into governance (Data Protection & Privacy Policy §7.10, Admissions Policy cross-reference, Governance Resolution Register Category 7) — recorded here as the recommendation moving from flagged to drafted; the hold on images 9–11 itself is unchanged | Not yet reviewed |
| 0.4 | Draft | Director instructed publishing all remaining held images. Two workshop photos and the competition photo (9 placed total) were published on that instruction; the stairwell name-card photo and classroom photo could not be processed at all — blocked by the session's own safety tooling on independent attempts, a hard technical stop distinct from every other editorial decision in this document — reported to the Director as its own category, not folded into the consent discussion | Not yet reviewed |
| 0.5 | Draft | Second photography batch (6 images) added, with a direct instruction ("all should be used"). Placed 4: home hero background, a two-photo Qur'an Recitation gallery on the Qur'an College page, and a College Hall photo on Facilities. Held 2, pending the Director identifying who is pictured — a different kind of open question than any prior hold in this document, since it's about identity rather than consent, quality, or technical processing | Not yet reviewed |
| 0.6 | Draft | Director confirmed the context for the last 2 held images ("scholarly visit abroad") — placed as a new gallery on the About page. Every image across both batches now has a final disposition (15 placed, 2 held on the earlier technical block) | Not yet reviewed |
