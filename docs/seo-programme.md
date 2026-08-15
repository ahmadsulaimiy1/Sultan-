# SHRS Search Programme

What was measured, what was fixed, and what an admissions engine actually
requires. Written to be argued with: every claim here is either a count taken
from this repository or a stated assumption.

---

## 0. The forecast, first, because it governs everything else

**500 enquiries in two weeks is not achievable through SEO, and no honest
programme should be sold on it.** A new or newly-marked-up page must be
crawled, indexed, and then earn position against incumbents. For competitive
head terms — *best school in Lagos* — that is months, not days, and it depends
on authority the domain has not yet accumulated.

The directive itself already corrects this, and these are the KPIs it asks
for, with the assumptions stated:

| Horizon | Conservative | Expected | Best case |
|---|---|---|---|
| Weeks 1–4 | indexation of 42 pages; entity recognised | + long-tail impressions begin | + first Maps impressions |
| Months 2–3 | 3–8 long-tail terms in top 10 | 15–30 long-tail in top 10 | first head-term top 20 |
| Months 4–6 | steady enquiry flow from brand + long-tail | *Ikorodu / Islamic school* cluster top 3 | *Islamic school Lagos* top 5 |
| Months 6–12 | compounding | head terms contested | *best Islamic school Nigeria* top 3 |

**Assumptions, all of which can fail:** that a Google Business Profile is
claimed and verified (nothing here can substitute for it); that reviews are
solicited from real families; that the content calendar is actually published;
that no manual action or technical regression occurs; that competitors do not
simultaneously invest. Rankings are not owned, they are rented, and no
agreement with Google exists to hold them.

**Two weeks is achievable for one thing only:** being *correctly indexed and
correctly described*. That is what was built below, and it is the prerequisite
for everything in the table.

---

## 1. What was measured before anything was written

| Finding | Before | After |
|---|---|---|
| `School` / `EducationalOrganization` entity | **absent sitewide** | on all 42 public pages |
| `WebSite` + `SearchAction` | absent | on all 42 |
| `BreadcrumbList` | 139 pages | unchanged (already good) |
| `FAQPage` | 3 pages, 21 Q&A | unchanged — see §4 |
| Sitemap coverage | 30 URLs | 42 URLs, all public pages |
| hreflang in sitemap | none | 105 alternates, **0 broken** |

Run with `node scripts/seo-build.mjs`.

### Why the entity was the biggest single gap

The site told Google where each page sat in a hierarchy (`BreadcrumbList`) but
never what the institution *is*. Without a `School` node there is no entity for
a Knowledge Panel to attach to, no structured address to reconcile against a
Maps listing, and nothing an answer engine can cite when a parent asks an AI
"Islamic school in Ikorodu". Every downstream tactic — Maps, reviews, AI
Overviews, sitelinks — hangs off that node existing.

### Two faults found by checking rather than assuming

**The hreflang cluster.** The first sitemap pass emitted `ar` / `fr` / `yo`
alternates for every page. **21 of 126 pointed at pages that do not exist.** A
broken hreflang cluster is worse than none: Google discards the whole set
rather than the bad row. The generator now verifies each translation against
disk before declaring it. Final: 105 language alternates, 0 broken.

**The department URLs.** The entity listed the five institutions from memory
rather than from the site. `/academics/islamic-arabic/` **does not exist**, and
the Qur'an and Online nodes pointed at `/quran-centre/` and `/online-courses/`
— sibling pages, not the institutions the site's own `/academics/` index links
to. A 404 inside structured data is a statement that the school has a
department it does not have. Names are now taken from each page's own `<h1>`
and URLs from the site's own navigation, and `seo-build.mjs` exits non-zero if
any URL it is about to assert fails to resolve on disk.

Both faults share a cause worth naming: the markup was written from what the
site *should* contain rather than from what it *does*. The check is now part of
the build, not part of my attention.

### What is deliberately NOT in the markup

No `aggregateRating`, no award, no accreditation claim, no student count.
Structured data is a statement made to a search engine on the institution's
behalf, and a false one is a false claim wherever it is read. Google also
treats markup that does not match visible content as a spam signal — inventing
here would risk the very rankings it was meant to win. When the school holds a
Ministry approval number or genuine reviews, both go in the same day.

---

## 2. The keyword universe, by intent rather than by volume

Head terms are where the ambition sits; long-tail is where the enquiries come
from, because a parent typing eight words has already decided to act.

**Head (months, high competition):** best school in Lagos · best school in
Nigeria · best Islamic school in Nigeria · best private school in Lagos ·
international school Lagos · Cambridge school Lagos

**Local (weeks–months, high conversion):** Islamic school in Ikorodu · private
school Ikorodu · schools near me Ikorodu · boarding school Ikorodu Lagos ·
Qur'an school Lagos · nursery school Ikorodu

**Long-tail, decision-stage (fastest, highest intent):**
- *school fees for private schools in Lagos 2026*
- *Islamic boarding school in Nigeria with British curriculum*
- *how to apply to a private school in Lagos*
- *schools in Lagos that teach Qur'an and Cambridge*
- *best hifz school in Nigeria with secular education*
- *boarding school Nigeria for international students*
- *Nigerian school accepting mid-term admission*

**The observation that should drive the calendar:** a Nigerian parent's single
most-searched question is *fees*, and it is the question most schools refuse to
answer on-site. A page that answers it plainly will out-earn any amount of
"excellence" copy.

---

## 3. Local SEO is the highest-value work available, and it is not code

For "school near me" and Maps, the ranking factors are proximity, prominence
and relevance — and **none of them are controlled from this repository.**

Ranked by return:

1. **Claim and verify the Google Business Profile.** Nothing else here matters
   until this exists. Category *Islamic school* + *Private educational
   institution*; the exact NAP below; real photographs; opening hours.
2. **Reviews from real families.** Volume and recency both count. Ask at
   parents' evenings and after graduations.
3. **NAP consistency** — the same name, address and phone everywhere:
   `Sultan Hanafi Royal Schools · Ikorodu, Lagos State, Nigeria · +234 807 374 7650`
4. **Citations**: VConnect, Nairaland listings, Finelib, school directories.
5. **Neighbourhood pages** — only where the school genuinely serves that area.
   Inventing catchment pages is how a site earns a doorway-page penalty.

**A full street address is required for Maps.** The site publishes only
"Ikorodu, Lagos State". Until the street address is confirmed and added, the
Maps opportunity stays shut — this is the highest-value missing fact.

---

## 4. Content, against the decision journey

Each cluster answers a question a parent actually types, in their words:

- **Fees & value** — fee structure, what is included, payment plans, scholarships
- **Curriculum** — Cambridge vs WAEC/NECO, how the Islamic and secular streams combine
- **Boarding** — a day in the life, safeguarding, pastoral care, meals
- **Qur'an** — hifz pathway, tajwīd, how memorisation is verified
- **Admissions** — how to apply, entrance assessment, mid-term entry, required documents
- **Outcomes** — results, university destinations, graduate profile

Each becomes a `FAQPage` (the site has 3; it should have one per cluster), and
each is written to be quotable by an answer engine: **question as the heading,
answer in the first forty words, then the detail.** That format is what gets
cited in AI Overviews, and citation is the new first position.

---

## 5. What still needs doing, in order

1. **Google Business Profile** — claim, verify, categorise. *(not code)*
2. **Confirm the street address**, then add it to the entity. *(one fact)*
3. **Fee page** — the highest-intent unanswered query in the market.
4. **FAQPage per cluster** — six pages, six schemas.
5. **Core Web Vitals** — measure with real field data before optimising.
6. **`sameAs`** — official social profiles, once confirmed, to consolidate the
   entity.
7. **Digital PR** — Qur'an competition results, graduations, and the AI/digital
   campus work are genuinely newsworthy in Nigerian education press.

Items 1 and 2 are worth more than everything else combined, and neither is
something a repository can do for you.
