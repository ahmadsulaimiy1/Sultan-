# SHRS World-Class Website Enhancement Report v1.1

**What this document is.** The requested deliverable from the "Supreme
Website Excellence Directive" — a report, not a build. Per that
directive's own explicit ask ("Produce: SHRS World-Class Website
Enhancement Report") and per your closing note in this same message, no
code was changed to produce this: no new admissions workflow, no KYC
system, no AI assistant rebuild, no faculty avatars, no new Adhkār
content was built. Everything below is audit, honest critique, and
prioritised recommendation — extending `docs/shrs-website-excellence-
roadmap.md` (written earlier this session) with the specific new angles
this directive asked for, not repeating what that document already
covers.

**Your own closing recommendation is correct and is adopted as this
report's sequencing principle:** finish Cloudflare/Neon go-live before
building anything below marked "High Priority" or heavier. Nothing here
should pull focus from Phase 3 onward once you say "Let's continue
Cloudflare."

**v1.1 revision note.** Your "Executive Response" accepted this report as
the strategic roadmap and asked for the Adhkār Centre target and the
faculty-identity standard to be sharpened and stated more ambitiously.
This revision updates Sections 5 and 6 only, and the corresponding rows
in the ranked list, to match — still a document-only change, nothing
below was built. As before, this is not a re-audit: every other section
stands as originally written.

**One standing discipline carried over from every other document in this
project, restated because two items in your directive touch it
directly:** no invented names, photos, or credentials. Section 5 below
specifically pushes back on one instruction in the original directive
(synthetic "professional avatar" images for real, named staff) and
explains why, with an alternative that holds the same standard applied
everywhere else on this site.

---

## 1. Menu Architecture / Information Architecture

**Current state, checked against the live header markup:** the mega-menu
is one level deep. "Education" opens to four cards — Nursery & Primary,
Royal College, Islamic & Arabic Studies, Qur'an College — each linking to
one institution-level page. There is no second tier: no per-class-level
page (Creche through SSS3), no per-pathway page (WAEC/NECO/JAMB tracks
under Royal College; Tahseen/Hifz/Murajaʿah/Ijazah under Qur'an College).
The directive's complaint is accurate: the menu currently exposes
**institutions**, not the **educational ecosystem** underneath them.

**Honest sizing of the ask, before recommending an approach:** building a
fully separate page for every listed level (Creche, Nursery 1–3, Basic
1–6, JSS 1–3, SSS 1–3 = 14 pages) plus every named pathway (WAEC, NECO,
JAMB Prep, Tahseen, Hifz, Murajaʿah, Ijazah, Advanced Qur'anic Studies,
Arabic Language, Islamic Studies, Classical Texts, Advanced Programmes =
12 more) is **26 new pages**, each needing real, non-duplicated content —
otherwise it becomes 26 near-identical pages with a class name swapped
in, which reads as padding, not depth, to the exact "British educator" /
"school inspector" personas this project has been careful about
impressing honestly.

**Recommendation — a middle path that avoids both failure modes:**
- Keep the four institution hub pages as the primary destinations.
- Give each hub page a genuine **anchored sub-navigation strip**
  (Creche → SSS3 as in-page anchors under Nursery & Primary /Royal
  College; the four Qur'an College stages already exist as the Hifz
  Journey — extend that same real, already-built pattern to name
  Tahseen/Hifz/Murajaʿah/Ijazah explicitly rather than folding them into
  generic "stages").
- Reserve **full standalone pages** for the handful of sub-programmes
  that have genuinely distinct content to say (e.g., a JAMB Preparation
  page makes sense as its own page since JAMB prep is a distinct,
  describable service; "Basic 4" does not need to be its own page if all
  it would say is "part of the Nursery & Primary curriculum, ages X–Y").
- Update the mega-menu to reflect this two-tier depth once the content
  exists — not before, since a dropdown promising a page that's just a
  content stub would be the same "looks complete, isn't" failure mode
  this project has consistently avoided.

---

## 2. Admissions as a Real Digital Process

**What already exists, checked against the codebase (this is not
starting from zero):** a real guardian self-registration + email
verification flow, a login/session system, an `/portal/apply/` intake
already wired into the guardian dashboard, and an `admissions_applications`
schema with a staff-side review endpoint. This is functionally Stages
1–2 and a version of Stage 9 (a single intake form) of the directive's
12-stage list already.

**What's genuinely missing against the requested 12 stages:** distinct
structured steps for Medical Information, dedicated Emergency Contacts
(a *guardian_emergency_contacts* table exists for the parent's own
profile, not yet extended to a per-application emergency-contact step),
Document Upload (no file-storage integration exists yet — this needs a
real decision on where files live, e.g. Cloudflare R2, before it can be
built), Identity Verification (see Section 3 — this is the KYC question),
and a distinct Application Review → Decision status machine visible to
the parent (today's schema supports staff review; there's no
parent-facing "your application is under review / decision" status view
yet).

**Recommendation:** treat this as a real build, but sequenced *after*
Cloudflare go-live per your own note, and built as an extension of the
existing `admissions_applications` schema and `/portal/apply/` flow —
not a parallel new system. Document Upload specifically needs one
infrastructure decision first (object storage provider) before any
UI work makes sense.

---

## 3. KYC Framework — Recommendation Only

**The applicable law is Nigerian, not generic "international school"
practice — this matters and is worth stating plainly:** the relevant
compliance framework for a Nigerian institution collecting minors' and
guardians' personal data is the **Nigeria Data Protection Act 2023**
(and the NDPR it superseded), not a GDPR- or US-style KYC framework
borrowed wholesale from banking or Gulf-region universities. Any KYC
design should be reviewed against that Act specifically, ideally by
someone qualified in Nigerian data-protection law — this report
recommends that step rather than substituting for it.

**What a realistic, compliant identity framework would collect,** in
rough order of sensitivity:
- **Parent/guardian identity:** full legal name, a government-issued ID
  type + number (not the ID image itself stored longer than needed to
  verify), phone, email, residential address.
- **Student identity:** full legal name, date of birth, a birth
  certificate or equivalent, prior school records if transferring.
- **Address verification:** a utility bill or tenancy document is the
  realistic Nigerian equivalent of the "proof of address" step
  international frameworks use — not a foreign-style credit-bureau check
  that doesn't meaningfully exist for this population.
- **Supporting documents:** prior report cards/transcripts, immunisation
  record if the school requires one, passport photograph.

**What this report explicitly recommends against:** collecting biometric
data (fingerprints, facial-recognition enrolment) for a K-12 population
without a specific, named legal basis and a Data Protection Impact
Assessment — this is exactly the kind of "looks rigorous" feature that
creates real regulatory and safeguarding exposure disproportionate to
the admissions problem it solves. "Serious and credible" does not require
biometrics; it requires consistent document collection, clear retention
rules (see `IT-04` Records Retention Policy, already published), and a
named data controller — all lower-cost, lower-risk, and already partly
in place via existing policy.

---

## 4. AI Assistant — Elevation Roadmap (Not a Rebuild)

**Current state:** `functions/api/chat.js` already routes enquiries to
the correct office and is described in `docs/digital-assistant.md` as
scoped to real site content. This section is a roadmap for tone and
knowledge depth, not a claim that the current assistant is broken.

**Gap 1 — knowledge breadth.** The directive asks for fluency across
programmes, admissions, fees, policies, timetables, student life,
Qur'an College, and Arabic programmes. Fees and a real Academic Calendar
are still open content gaps site-wide (Section 1 of the earlier Excellence
Roadmap) — the assistant cannot honestly discuss what the site itself
doesn't have. Assistant knowledge depth is capped by site content depth,
not a prompt-engineering problem alone.

**Gap 2 — tone.** "Like a knowledgeable admissions officer," never
"As an AI..." — this is a real, low-cost, high-value fix: a system-prompt
and response-style review specifically to (a) ban AI self-reference
phrasing, (b) adopt a warm-but-formal institutional register matching the
Director's-message tone already established elsewhere on the site, and
(c) hand off to WhatsApp/human contact at the specific points where a
real admissions officer would say "let's continue this by phone," rather
than attempting to answer everything indefinitely.

**Recommendation:** a scoped prompt/config review (not a rebuild) is a
legitimate near-term item once fee/calendar content gaps close — the
tone fix alone can happen sooner, independent of content gaps, and is
appropriately sized as a "should do" once Cloudflare work resumes,
covered in the ranked list below as its own item.

---

## 5. Faculty Representation — One Instruction Overridden, With Reasoning

**What the directive asked for:** a full faculty directory with photos,
and — where photographs are unavailable — "a mature professional
institutional avatar style," explicitly not cartoon or generic
placeholders.

**Why this report recommends against the avatar instruction as
written:** every other document in this engagement has held one
consistent line — no invented imagery representing real, named people.
A synthetic "professional avatar" generated to stand in for a real
teacher's photograph is still a fabricated likeness attached to a real
name, which is the same category of problem as an invented credential or
an invented quote, just visual instead of textual. This isn't a
stylistic quibble; it's the same anti-fabrication discipline that has
governed every policy, every prospectus, and every dashboard number in
this project so far, and this report keeps it consistent rather than
carving out an exception for photography.

**The alternative that achieves the same visual seriousness the
directive is actually asking for:** a **monogram/initials treatment** —
the person's initials set in the site's own display typeface (Cinzel),
on the institutional gold/charcoal palette, in a consistent frame size —
reads as deliberate and premium (this is standard practice at genuinely
prestigious institutions specifically *because* it avoids the
"stock photo" problem, not despite it), with zero risk of misrepresenting
anyone. Real photographs replace the monogram the moment they're
supplied, with no template change needed.

**Confirmed and expanded per your Executive Response.** The monogram
approach is accepted. The full institutional identity card standard, per
person, is now specified as:

| Field | Source | Notes |
|---|---|---|
| Initials Monogram | Generated from real name | Cinzel typeface, gold/charcoal, fixed frame size |
| Academic Title | Real (Mr./Mrs./Dr./Shaykh/Ustadh, etc.) | Matches the honorific standard already used for the Director |
| Qualifications | Real, as supplied | Degree + institution, never abbreviated to imply more than stated |
| Department | Institution-appropriate | e.g. "Qur'an College — Tahfīẓ" not a generic "Teacher" |
| Subject Specialisation | Real, as supplied | e.g. "Arabic Language, Nahw" per the existing workforce-data-collection categories |
| Faculty Category | Real | Teaching / Academic Leadership / Administrative, per the Human Capital Register's eventual structure |
| Institutional Colour Coding | Design system, not data | A colour tag per institution (Nursery & Primary / Royal College / Qur'an College / Islamic & Arabic Studies) reusing the palette already established for each school's page identity, so the directory visually sorts itself the way the mega-menu already does |

This is a card format genuinely comparable to how respected universities
present faculty (name/title/credentials/department, no photograph
required to look complete) rather than a placeholder — the distinction
your response draws (identity system vs. placeholder) is the correct
one, and it's achieved without a single invented detail.

**Everything else in the directive's ask stands as previously
recommended** (see `shrs-website-excellence-roadmap.md` Part 3):
group by institution, real qualifications only, no merged Qur'an
College/Arabic Studies lists.

---

## 6. Adhkār Centre — Strategic Content Objective, Not a Future Possibility

**Important correction to the directive's original premise, checked
directly against `js/adhkar-data.js` and `js/adhkar-app.js` this session:**
several requested features **already exist and are live**, not gaps —
this remains true after the Executive Response and is restated here so
the sharper target below isn't mistaken for a rebuild of things that
already work:
- Session time estimates and a live countdown ("session time left") —
  already built (`fmtMinutes`, `sessionTimeLeft`).
- Quick modes (2-minute / 5-minute / 10-minute / Complete) — already
  built.
- A streak system tracking daily completion — already built.
- **Personal Favourites** — already built (`FAV_KEY`, heart-toggle on
  every item).
- **Recently Viewed** — already built (`recentlyViewed` label and
  tracking already present).

**Per your Executive Response, the content target is now stated as a
firm strategic objective, not an aspiration, and it is larger than the
original framing:** approximately **40–70 Morning Adhkār and, separately,
40–70 Evening Adhkār** — not 40–70 combined. Against the current baseline
of 11 Morning-tagged and 12 Evening-tagged items (31 total across every
category), this is a substantially larger content programme than
originally scoped: potentially **80–140 items across Morning and Evening
alone**, before the nine additional named collections below are counted.
Stated plainly, since honesty about scale is more useful than a
comforting understatement: this is the single largest content-sourcing
effort in this report, larger than any other single item in the ranked
list, and should be resourced and scheduled as such — likely a
phased build (e.g., 20 additional items per collection per phase) rather
than one pass.

**Additional named collections, checked against what already exists so
the ask is accurate:**

| Requested collection | Current status |
|---|---|
| Sleep Adhkār | Exists (`sleep` category, several items) — needs expansion |
| Prayer Adhkār | Exists as `after-salah` — consider renaming/expanding to match this framing |
| Travel Adhkār | Exists (`travel` category, 1 item) — needs expansion |
| Protection Adhkār | Exists (`protection` category) — needs expansion |
| Distress Adhkār | Exists (`distress` category) — needs expansion |
| Gratitude Adhkār | **Genuinely new** — no category exists today |
| Family Adhkār | **Genuinely new** — no category exists today |
| Children's Adhkār | **Genuinely new** — no category exists today; would need age-appropriate, simplified presentation, not just simpler wording |
| Daily Sunnah Adhkār | **Genuinely new** — distinct from the occasion-based categories that already exist (entering/leaving home, entering/leaving mosque) |

**UX layer, re-checked against your expanded list:**
- Session Progress, Completion Tracking, Streak Tracking, Estimated
  Reading Time, Personal Favourites, Recently Read — **all already
  built**, per above.
- **Reading History** (a persistent log distinct from "recently viewed,"
  e.g. a full dated record of every completed session) — genuinely new.
- **Personal Collections** (user-curated custom lists, distinct from
  Favourites) — genuinely new.

**Notifications, expanded per your response:** Daily Morning Reminder,
Daily Evening Reminder, **Prayer-linked Reminder** (tied to the site's
existing prayer-time integration in the Personalisation Centre — a
genuinely natural extension, not a bolt-on), Browser Notifications,
Mobile Notifications where feasible. **Honest technical scope, stated
plainly per your own instruction not to promise unsupported
functionality:** browser push notifications work reliably on
Chrome/Android and installed PWAs; iOS Safari's support remains
restrictive even in 2026 and any commitment here should name that
limitation up front, not discover it after building.

**Progressive Web App, expanded per your response:** Add to Home Screen,
Installable Experience, Offline Reading, **Cached Adhkār Library**
(the full content set available with zero network connection once
installed) — a coherent, buildable target given the content is already
static data (`js/adhkar-data.js`), which is precisely the kind of content
that caches well. The long-term framing — "function almost like a
dedicated application" — is realistic for this specific feature, more so
than for most of the rest of the site, because the content is bounded,
text-based, and already structured as data rather than server-rendered
pages.

**Recommendation, in order, reflecting the new scale:** (1) commission
real Qur'an/Hadith-sourced content toward the Morning and Evening targets
first, phased rather than attempted in one pass, since this is now the
report's single largest content effort; (2) build out the four genuinely
new collections (Gratitude, Family, Children's, Daily Sunnah) once the
Morning/Evening expansion establishes the sourcing workflow; (3) add
Reading History and Personal Collections as a UX layer once content
volume justifies them (a "collections" feature is more valuable at 100+
items than at 31); (4) scope notifications and the offline/cached PWA
shell last, both honestly bounded to what each platform actually
supports.

---

## 7. Content Tone Review

**Spot-checked directly this session** (homepage hero, Director's
Message, admissions copy): the tone is already largely formal and
dignified — the Director's Message names real credentials and reads as
a genuine institutional letter, not marketing copy; the hero line ("We
Nurture Tomorrow's Leaders") and admissions framing are restrained
rather than hyperbolic.

**Where tone genuinely could lift further:** a few programme-description
paragraphs (Nursery & Primary, Islamic & Arabic Studies in particular,
per the earlier `site-design-audit.md` finding) are the shortest, plainest
copy on the site — not undignified, just thin compared to the Royal
College and Qur'an College pages' depth. Elevating tone here is really
the same fix as the visual-identity-parity gap already logged in the
Excellence Roadmap (Part 4, item under "Nice to Have" territory in that
document) — a content-depth pass, not a rewrite of what exists.

**Recommendation:** a single editorial pass across the four institution
pages to bring Nursery & Primary and Islamic & Arabic Studies up to the
same descriptive depth as Royal College and Qur'an College — this is
lower-cost than it sounds, since the source material (curriculum text,
timetables) already exists per `site-design-audit.md`'s own finding; it
needs expansion, not invention.

---

## 8. Ruthless Visual Polish Audit

Asked for directly: no compliments, only what still prevents "premium,
elegant, prestigious, international, world-class."

- **Homepage length and density.** The homepage stacks hero →
  announcements → director's message → seal/values → mission/vision →
  (and more sections below) in one long scroll. Individually each
  section is well-executed; together, a first-time visitor on a slow
  connection scrolls a long way before reaching anything actionable
  beyond the hero CTAs. A genuinely world-class homepage this dense
  usually adds a persistent secondary nav or "jump to" affordance so the
  length reads as generous, not sprawling.
- **The Announcement Hero's empty state is the newest, most prominent
  section on the page, and it is currently the one thing actively saying
  "nothing here yet."** This was flagged in the maturity assessment and
  remains true today — it's a real, visible weak point until at least
  one announcement is published.
- **Policy pages are information-dense to the point of strain** — one
  entry alone (`policies/index.html`) builds to 160KB+ of markup. That's
  correct content depth, but the accordion pattern hasn't been tested
  for how it *feels* to a parent skimming on a phone with one thumb —
  worth an honest usability pass, not just a technical one.
- **Typography hierarchy on sub-programme content is flatter than the
  hero/homepage.** The display type system (Cinzel/Amiri, Cormorant
  Garamond/Amiri, Inter/Cairo) is genuinely strong where it's fully
  applied (hero, seal section, governance), but deeper pages read closer
  to a well-styled document than the hero's "institutional" feel —
  consistent with the Nursery & Primary/Arabic Studies thinness already
  named above, but true even on the stronger pages' body copy.
- **Iconography is comprehensive but uniformly line-weight** — every
  icon on the site (facilities, footer grid, mega-menu) uses the same
  thin-stroke SVG style. This is a coherent system, correctly so, but it
  means nothing ever visually signals "this is the most important icon
  on the page" — there's no weight/fill variant reserved for genuinely
  primary actions versus the other 90% of icons.
- **Mobile footer, while genuinely improved (card-style at ≤760px per
  the maturity assessment), is feature-dense** — quick actions, social,
  governance links, admissions, publications, institutional block, map —
  all condensed into a horizontal ribbon. Worth checking honestly whether
  this reads as "everything, organised" or "everything, compressed" on a
  small screen; this report can't certify that distinction without a
  real usability session, so it's named as a question, not a confirmed
  defect.
- **No dark-mode / low-light reading option** exists anywhere on the
  public site — the Personalisation Centre's Reading Mode and accent
  options are portal-adjacent, not applied to the marketing pages
  themselves. A genuinely international-tier site increasingly treats
  this as baseline, not a bonus.

---

## Deliverable — Organised Findings

### Immediate Priority
1. Publish real tuition fees (or a deliberate "on enquiry" statement) —
   carried forward from the Excellence Roadmap; still the single highest
   admissions blocker.
2. Publish registration/RC number + registering authority — same status.
3. Finish Cloudflare/Neon go-live (Phases 3–6 already in progress) —
   per your own note, nothing below should precede this.

### High Priority
4. Anchored sub-navigation on the four institution hub pages (class
   levels, named pathways) — Section 1's recommended middle path.
5. Editorial depth pass on Nursery & Primary / Islamic & Arabic Studies
   copy — Section 7.
6. Expand Adhkār coverage toward 40–70 items, sourced with real
   references — Section 6.
7. AI Assistant tone/system-prompt review (ban "As an AI," adopt
   admissions-officer register) — Section 4.
8. Faculty directory structure, using the monogram alternative — Section
   5, once real workforce data exists.
9. Document-storage decision (e.g. Cloudflare R2) as the prerequisite for
   Admissions Stage 9 (Document Upload) — Section 2.
10. Short-before-long ordering audit within each Adhkār category —
    Section 6.

### Medium Priority
11. Extend admissions schema for structured Medical Information and
    per-application Emergency Contacts — Section 2.
12. Parent-facing application status view (submitted → under review →
    decision) — Section 2.
13. KYC data-collection design reviewed against the Nigeria Data
    Protection Act 2023 by a qualified reviewer — Section 3.
14. Adhkār notification/reminder system, scoped honestly to what
    Chrome/Android and installed PWAs actually support — Section 6.
15. Add-to-home-screen / PWA shell for the Adhkār Centre, same honesty
    scope — Section 6.
16. Homepage "jump to" navigation or section-shortening pass, given its
    current length — Section 8.
17. A primary/secondary icon-weight variant for the most important
    calls-to-action — Section 8.
18. Dark-mode / low-light reading option for the public marketing pages,
    not just the portal — Section 8.
19. Usability session (not just technical review) on the mobile policy
    accordion and mobile footer ribbon — Section 8.
20. Standalone pages for the sub-programmes that genuinely warrant one
    (e.g. JAMB Preparation) — Section 1.

### Future Expansion
21. Full 26-page class-level/pathway build-out, if the school later
    decides every level deserves its own page rather than the anchored
    middle path — Section 1.
22. Biometric identity verification — explicitly **not recommended** at
    this population/risk level; listed only so it isn't silently dropped
    from the original ask, not as an endorsement — Section 3.
23. Document Upload + Identity Verification stages, once the storage
    decision (item 9) is made — Section 2.
24. Full real faculty directory content build-out, once workforce data
    is supplied — Section 5.
25. Everything already named as Future Expansion in
    `shrs-website-excellence-roadmap.md` (language selector, full
    body-text search, the public Ijazah verification endpoint) — not
    repeated here, still valid.

---

## Top 50, Ranked

Ranked by a blended read of Strategic Impact, Parent Confidence,
Admissions Conversion, Educational Prestige, and Technical Complexity —
stated per-item only where one factor dominates the ranking; otherwise
the rank reflects the blend. Items 1–25 below are new to this report;
26–50 draw the still-open items forward from
`shrs-website-excellence-roadmap.md`'s own Top 25 so this list is genuinely
complete rather than a partial re-ranking. Where an item from that
document has since been confirmed already-built (this report's Section
6 findings), it is marked so here rather than silently dropped.

| # | Item | Strategic Impact | Parent Confidence | Admissions Conversion | Prestige | Technical Complexity |
|---|---|---|---|---|---|---|
| 1 | Publish real tuition fees | Highest | Highest | Highest | Medium | None (content) |
| 2 | Publish registration/RC number + authority | Highest | Highest | Medium | High | None (content) |
| 3 | Finish Cloudflare/Neon go-live (Phases 3–6) | Highest | Medium | Medium | Medium | Already in progress |
| 4 | Confirm + publish WAEC/NECO affiliation | High | High | Medium | High | None (content) |
| 5 | Anchored sub-navigation on institution hubs | High | Medium | Medium | High | Medium |
| 6 | Expand Adhkār: 40–70 Morning + 40–70 Evening (separately), phased | High | Medium | Low | High | Medium (largest content effort in this report) |
| 7 | AI Assistant tone/system-prompt review | Medium-High | Medium-High | Medium | Medium-High | Low |
| 8 | Editorial depth pass, Nursery/Arabic Studies copy | Medium | Medium | Low-Medium | Medium-High | Low |
| 9 | Get Communications role publishing real announcements | High | Medium-High | Low | Medium | Low (infra exists) |
| 10 | Real online admissions application (Stage 2 build) | High | High | High | Medium-High | High |
| 11 | Document-storage decision (prerequisite for uploads) | Medium | Low | Medium | Low | Medium |
| 12 | Publish scholarship criteria, if real | Medium-High | High | Medium-High | Medium | None (content) |
| 13 | Donor/sponsor-facing page | Medium | Low | Low | Medium | Medium |
| 14 | Real student-life content (clubs, competitions) | Medium | Low-Medium | Low-Medium | Medium | Low-Medium |
| 15 | Faculty directory structure (monogram standard) | Medium | Medium | Low | Medium-High | Low (structure only) |
| 16 | Short-before-long Adhkār ordering | Low-Medium | Low | None | Low-Medium | Low |
| 17 | Parent-facing application status view | Medium | High | Medium | Medium | Medium-High |
| 18 | KYC design reviewed against NDPA 2023 | Medium | Medium | Low | Medium | Medium (needs legal review) |
| 19 | Structured Medical Information + Emergency Contacts (app.) | Medium | Medium | Low-Medium | Low-Medium | Medium |
| 20 | Native-Arabic-speaker review pass | Medium-High | Medium (GCC-aligned persona) | Low | High | Medium |
| 21 | Replace remaining `.image-slot` placeholders | Medium | Low-Medium | Low | Medium | Low (needs real photos) |
| 22 | Publish real Academic Calendar | Medium | Medium | Low | Low-Medium | None (content) |
| 23 | Adhkār notifications: morning/evening/prayer-linked (scoped honestly re: iOS) | Low-Medium | Low | None | Low-Medium | Medium |
| 24 | Adhkār PWA: install + offline reading + cached library | Medium | Low | None | Medium | Medium |
| 25 | Standalone pages for genuinely distinct sub-programmes | Low-Medium | Low | Low | Medium | Medium |
| 26 | Real Lighthouse performance audit | Medium | Low | None | Low | Low |
| 27 | Real accessibility audit (axe-core) | Medium | Low | None | Medium | Low |
| 28 | Breadcrumb component, 3+-level pages | Low-Medium | Low | None | Low | Low |
| 29 | Mobile-viewport Playwright pass on portals | Medium | Low | None | Low | Low-Medium |
| 30 | Homepage "jump to" nav / section-shortening | Medium | Low | Low-Medium | Medium | Low |
| 31 | Primary/secondary icon-weight variant | Low | Low | None | Medium | Low |
| 32 | Dark-mode / low-light reading option, public pages | Low-Medium | Low | None | Medium | Medium |
| 33 | Usability session on mobile accordion/footer | Medium | Low | Low | Medium | Low (research, not build) |
| 34 | Surface Punch Newspapers citation near hero | Medium | Medium | Low | Medium-High | Low |
| 35 | PWA manifest for portal dashboards | Low-Medium | Low-Medium | None | Low | Low |
| 36 | Adhkār: Gratitude / Family / Children's / Daily Sunnah collections (genuinely new, per Executive Response) | Medium | Low-Medium | Low | Medium-High | Medium (new content, no existing pattern to extend) |
| 37 | Scope Adhkar scripts to relevant pages only | Low | None | None | Low | Low |
| 38 | Responsive `srcset` for gallery images | Low | Low | None | Low | Low-Medium |
| 39 | Confirm `font-display` strategy | Low | None | None | Low | Low |
| 40 | Publish inspection/accreditation history, if real | Medium | Medium | Low | Medium-High | None (content) |
| 41 | Language selector UI | Low today | Low | Low | Medium | Medium (deferred by design) |
| 42 | Full body-text search indexing | Low-Medium | Low | Low | Low | Medium |
| 43 | Public Ijazah verification endpoint (IQ-02 §7.5) | Low today | Low | None | Medium (future) | High |
| 44 | Full faculty directory content, once data supplied | Medium (future) | Medium | Low | Medium-High | Medium |
| 45 | Biometric ID verification | **Not recommended** | — | — | — | High + regulatory risk |
| 46 | Document Upload UI build | Medium (future) | Medium | Medium | Medium | Medium-High |
| 47 | Identity Verification stage build | Medium (future) | Medium | Low | Medium | High |
| 48 | Full 26-page class/pathway build-out (max version) | Low-Medium | Low | Low | Medium | Very High |
| 49 | AI Assistant knowledge-depth expansion (post content gaps close) | Medium (future) | Medium | Medium | Medium | Medium |
| 50 | Full editorial tone pass, site-wide (beyond the two named pages) | Low-Medium | Low | Low | Medium | Low-Medium |

*(Row 36 was originally marked as an intentional duplicate in v1.0, since
no genuine 50th item existed at that time — an honest ranked list says so
rather than manufacturing a filler entry. The Executive Response's
expanded Adhkār scope supplied a genuine new item, so row 36 now reflects
that rather than the duplicate marker. Reading History and Personal
Collections, the two other newly-identified genuine gaps from Section 6,
are covered under item 6's phased build rather than broken out as
separate rows, since both depend on item 6's content volume before they
add real value.)*

---

## What this report is not

It is not a build log — nothing in Sections 1–8 was implemented; every
recommendation is exactly that. It is not a claim that the current site
underperforms broadly — Section 6 specifically corrects the original
directive's premise on the Adhkār Centre, where real, working features
already exceed what was assumed missing. It is not a substitute for
`docs/shrs-website-excellence-roadmap.md`, which remains the source for
the nine-persona and prestige-benchmark analysis this report builds on
rather than repeats. And per your own closing note, it is not a signal
to begin any of the above before Cloudflare/Neon go-live resumes.

**Resume point, unchanged:** say "Let's continue Cloudflare" to pick up
at Phase 3 (Database Initialization) of the Digital Campus go-live
roadmap.
