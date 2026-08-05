# Sultan Hanafi Royal Schools — Multi-Page Site Architecture

*Planning document. No pages are split yet — `index.html` remains the
single live flagship page until this plan is approved and built. See
`editorial-bible.md` for the brand system this architecture must carry
through every page.*

---

## Guiding Principle

The single-page build currently reads as **one continuous institutional
volume** — a document with chapters (Chapter II — Heritage, Chapter IV —
Governance, etc.), not a set of disconnected "pages." Splitting it into
real URLs must not lose that. The chapter/folio numbering stays global
across the whole site: Chapter IV is Governance whether it lives at
`/about#governance` or `/about/governance`, and the number never resets
per page. Every page keeps the same topbar, header, and footer chrome
so navigating between URLs feels like turning a page in the same book,
not leaving one site for another.

---

## Site Map

```
/                                  Home — flagship digest
/about                             Chapter I–IV: Director, Story, Seal, Mission/Vision/Values
/about/governance                  Chapter IV cont.: Board, Management Team, Key Staff (full ledger)
/academics                         Chapter V: hub — the institutions, side by side (five recognised; four have a dedicated sub-page below)
/academics/nursery-primary         Basic School (ages 2–10)
/academics/royal-college           Royal College — 7 departments, curriculum tables
/academics/arabic-islamic-studies  School of Islamic and Arabic Studies
/academics/quran-college           Qur'an College — Ijazaat pathway
/boarding                          Chapter VI: Boarding Facility
/admission                         Chapter VII: 12-step process, documents, [fees/calendar placeholder]
/facilities                        Chapter VIII: dot-leader facility index
/foundation                        Chapter IX: Sultan Zakariya Hanafi Foundation
/policies                          Chapter X: index of all 9 policies (accordion or list)
/policies/[slug]                   Individually linkable full policy (assessment, anti-bullying, career,
                                    dress-code, equal-opportunity, first-aid, health-safety, visitors, complaint)
/contact                           Chapter XI: address, phones, socials, form
```

**On `/policies`:** keep these as one page with anchors
(`/policies#assessment`) rather than nine separate URLs. Each policy is
short enough that nine page loads would fragment a reading experience
that currently works well as a single accordion document, and the
three-signature prepared/reviewed/approved chain reads better as a
consistent list than as isolated pages. Deep-link anchors give the
individually-linkable benefit without the fragmentation cost.

**On `/academics`:** built as a hub page, not a redirect — a proper
side-by-side comparison of the institutions (age range, curriculum
source, credential/outcome) before the visitor picks a track. This is
the site's real conversion fork: a parent choosing Royal College vs.
Qur'an College vs. the weekend Islamiyyah program is the single
most consequential decision the site needs to support. A fifth
institution, Sultan Hanafi Online & Distance Learning School, was
recognised by the Board's governance restructuring amendment of
2026-08-04; it has no dedicated sub-page in this site map yet, stated
plainly here rather than inventing one.

---

## Navigation Structure

**Topbar** (unchanged): contacts + social links, present on every page.

**Primary nav:**

```
SULTAN HANAFI Royal Schools     Our Story ▾   Academics ▾   Boarding   Admission   Facilities   Foundation   Policies   Contact   [Enrol Now]
```

- **Our Story ▾** → About (Director + Heritage + Seal + Mission/Vision/Values), Governance
- **Academics ▾** → hub, then the four built schools as sub-items — this is
  the one place a mega-menu earns its keep, since a parent needs to
  compare the institutions before committing to a sub-page
- Everything else stays a flat top-level link — the brief warns against
  generic template navigation, and a flat, short nav for a school this
  size reads as more confident than deep nesting for its own sake

**Footer** carries the same "Quick Links / Academics / Copyright" pattern
already built, expanded to link every top-level page plus the four
academic sub-pages and the policies index.

**Breadcrumbs:** a folio-style breadcrumb replaces a generic
`Home > Academics > Royal College` chevron trail — e.g.
`Chapter V · Academics — Royal College` at the top of each academic
sub-page, consistent with the folio device already in use.

---

## Homepage Strategy

The homepage is **not** the current full single-page document — it
becomes a **flagship digest**: enough of each chapter to establish
prestige and orient every audience, with a clear "read the full chapter"
link out to the dedicated page. Structure:

1. Hero (unchanged — identity statement, three CTAs)
2. Director's Message (unchanged — this is the trust anchor, stays in full)
3. Seal quadrants (unchanged — short, high-impact, stays in full)
4. Mission/Vision/CLEVER (unchanged — short, stays in full)
5. **Academics teaser** — the institutions as a condensed ledger
   (name, age range, one-line description) linking to `/academics` and
   each sub-page, replacing the full curriculum tables that currently
   live inline
6. **Governance teaser** — board chair + Head of Schools / Administrator only, linking to
   `/about/governance` for the full ledger
7. Pull-quote (parent/board member — unchanged)
8. **Admission CTA band** — condensed version of the 12-step process
   (maybe just steps 1, 5, 8, 11 as a 4-point summary) linking to
   `/admission`
9. Foundation teaser — one paragraph + link to `/foundation`
10. Contact (unchanged — stays in full; this is the page most likely to
    be the last thing a visitor sees regardless of entry point)
11. Footer (expanded, as above)

This keeps the homepage's current *emotional* weight (director's voice,
heritage, values) intact while moving the *reference* material (full
curriculum tables, full staff ledger, full policy text) to dedicated
pages where it belongs.

---

## Per-Audience Journeys

**Prospective parent (local/Lagos):** Home → Academics hub → Secular
College or Basic School → Admission → Contact/WhatsApp.

**Parent seeking Qur'an memorisation for a child:** Home → Academics hub
→ Qur'an College → Boarding (eligibility/fees once published) →
Admission.

**Community member seeking weekend Islamic studies (non-enrolling):**
Home → Academics hub → School of Islamic and Arabic Studies → Contact
(this audience does not go through Admission's 12-step process, which is
built for the day/boarding schools — the site should say so explicitly
on that page rather than funnelling everyone through one form).

**Donor/NGO/aid agency:** Home → Foundation → Contact (Foundation's own
phone/email, already distinct from admissions contact).

**Existing parent checking policy:** any entry point → Policies →
anchor-linked section.

---

## URL, Technical & i18n Notes

- Flat, lower-case, hyphenated slugs throughout (`/academics/royal-college`,
  not `/academics/royalCollege` or `/academics?school=royal-college`).
- Shared `<head>` (fonts, meta) and shared header/footer partials once
  this becomes a real multi-file build, so brand-system changes (a
  palette or type tweak) happen once, not across nine files.
- `/ar/` is built: every path above has a full Arabic (RTL) counterpart
  at the same slug under `/ar/` (e.g. `/ar/academics/royal-college/`),
  sharing this exact sitemap and URL structure rather than a separate
  translated site.
- The three open placeholders (academic calendar, fees/scholarships,
  international-student pathway) move with their sections to `/admission`
  and stay exactly as honestly flagged as they are today — splitting
  pages doesn't change the rule against inventing data.

---

## Status

**Planning only — approved for documentation, not yet built.**
`index.html` continues to serve as the single live page. When you're
ready to build, the recommended order is: extract shared header/footer
→ build `/about` + `/about/governance` → build the `/academics` hub +
four sub-pages → build the remaining single-topic pages
(`/boarding`, `/admission`, `/facilities`, `/foundation`, `/policies`,
`/contact`) → slim `/` down to the digest described above last, once
everything it links to actually exists.
