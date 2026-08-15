# SHRS Search Intelligence Programme

Everything below is either a count taken from this repository, a measurement
taken from a browser, or a cited finding from live research. Where something is
modelled rather than measured, it says so. Where I could not find out, it says
that too.

---

## 0. Two findings that come before the strategy

### 0.1 There are two websites, and Google knows the other one

Searching for the school by name returns **`shroyalschools.ng`** as its
official website — a live, indexed site with its own pages (`/lukman/`,
`/sultan-hanafi-nursery-and-primary-school/`). **`shroyalschools.com`, the site
in this repository, does not appear.**

Every canonical tag, the sitemap, the robots directive and the entity that this
programme installs all declare `.com`. They are being declared for a domain the
index currently associates less strongly with the school than a second one.

**DECIDED (15 Aug 2026): `.com` is the single authoritative digital home.**
The `.ng` site is a legacy source of institutional history, to be archived and
then redirected page-by-page — never a blanket redirect to the homepage. The
full audit, content-preservation matrix and URL migration map live in
`docs/legacy-migration/`. The redirects themselves must be deployed on the
`.ng` host by whoever controls its DNS and hosting; this repository can only
prepare the map.

### 0.2 The school already has national press, and was not claiming it

Three articles in **The Punch**, one of Nigeria's largest dailies:

- *Sultan Hanafi Royal Schools: Illuminating Minds and Nurturing Communities*
- *Lagos school charges graduates to be problem-solvers*
- *Winners emerge in N1.5m Quran competition*

Independent national coverage is the corroboration search engines and answer
engines weigh most heavily, precisely because the school cannot assert it about
itself. It is now cited in the entity via `subjectOf`. It should also be linked
from the site in a press section that a crawler can reach.

---

## 1. What was measured, and what changed

| | Before | After |
|---|---|---|
| First contentful paint, home page, fonts host unreachable | **12,960 ms** | **466 ms** |
| Render-blocking third-party requests | 1 on 223 pages | **0** |
| Preconnects to hosts nothing requests | 146 | 0 |
| `School` / `EducationalOrganization` entity | **absent sitewide** | 42 pages |
| `streetAddress` in the entity | **absent** (published on 152 pages of the site) | present |
| `sameAs` confirmed profiles | 0 | 3 |
| Press cited in markup | 0 | 3 |
| Opening hours in markup | none | 3 specifications |
| Pages with no canonical | 7 | **0** |
| Pages with no meta description | 6 | **0** |
| Pages with no `og:image` | 7 | **0** |
| Titles truncated in a result (>60ch) | 9 | **0** |
| Descriptions truncated (>160ch) | 6 | **0** |
| Sitemap coverage | 30 URLs | 42 |
| hreflang alternates | none | 105, **0 broken** |
| Image payload, 10 public pages | 10.5 MB | 9.7 MB |
| EXIF on published photographs | present | stripped |

Reproduce with `node scripts/seo-build.mjs`, `node scripts/meta-build.mjs`,
`node scripts/fonts-build.mjs`, `python3 scripts/images-build.py`.

### The 12,960 ms, stated precisely

That figure was measured in a browser that could not reach
`fonts.googleapis.com`. **It is not what a Lagos parent experiences**, and it
should never be quoted as though it were. What it is, is the site's failure
mode made visible: 223 pages could not paint a single pixel until a server the
school does not own answered. Nigeria's web traffic is **68.7% mobile** and
predominantly GSM ([DataReportal, *Digital 2026:
Nigeria*](https://datareportal.com/reports/digital-2026-nigeria)) — a
third-party round trip is exactly the request that stalls there.

The fonts were already half-committed to this repository: 19 `woff2` files in
`assets/fonts`, the same faces, referenced by no `@font-face` rule except the
Yoruba one. The site was paying a third party for typefaces it already owned.

### Three faults I introduced and then found

Recorded because a programme that only lists its wins is not an audit.

1. **The first sitemap emitted 126 hreflang alternates, 21 of which were
   404s.** A broken cluster is worse than none: Google discards the whole set
   rather than the bad row. The generator now checks each translation against
   disk.
2. **The first entity listed department URLs from memory.**
   `/academics/islamic-arabic/` does not exist. `seo-build.mjs` now exits
   non-zero if any URL it is about to assert fails to resolve.
3. **The first entity omitted the street address and left `sameAs` empty**,
   and I reported both to you as missing facts. Both were in the repository —
   the address on 152 pages, the profiles in the footer of 158.

All three share a cause: writing markup from what the site *should* contain
rather than from what it *does*. The checks are now in the build.

### What the image pass taught

Ten public pages loaded in a mobile viewport and scrolled to the foot: 50
images, 10.5 MB, no WebP or AVIF anywhere, **36 of 50 carrying more pixels than
were rendered** — 2248 px wide inside a 344 px box.

Re-encoding everything at quality 82 returned 4%, and on the worst offender it
returned *less than nothing*: 355 KB became 381 KB. These JPEGs are already
efficiently encoded for the pixels they carry. **The waste was never the
encoder, it was the pixel count.** Caps are now set per directory by what the
page actually renders.

`srcset` and WebP are worth more than that pass and are deliberately not done:
they mean wrapping several hundred `<img>` elements across 223 pages, and this
site's CSS targets images structurally, so a `<picture>` wrapper can silently
break a layout. That work needs a visual QA sweep beside it, not a script run
before one.

---

## 2. What the research actually found

### The head terms in the brief are not winnable, and not for lack of effort

The directive asks for *best school in Lagos*, *best school in Nigeria*, *best
Islamic school in Nigeria*. Those SERPs were inspected. Page one is
**Legit.ng, international-schools-database.com, nigeriaprivateschools.com,
NAPPS and EduTimes Africa** — listicles and directories, with no individual
school site among them.

Google has read that query as *"give me a list"*. A single school is not a
list. No amount of content, links or technical work makes one school the best
answer to a query whose intent is comparison across many. The database scores
these accordingly:

| Keyword | Modelled opportunity | Difficulty |
|---|---:|---:|
| best school in Nigeria | **1** | 99 |
| best Islamic school in Nigeria | **1** | 99 |
| best school in Lagos | **7** | 80 |
| islamic school in ikorodu | **60** | 22 |
| hifz school in lagos | **50** | 62 |

**The achievable goal is being *in* those lists, not outranking them.** That
makes directory submission and digital PR ranking levers rather than
housekeeping, and it should redirect most of the budget head terms usually eat.

### The niche where a school site *is* the right answer

SERPs for *Islamic school / tahfiz / hifz Nigeria* rank **individual school
websites** — `scholarsita.com`, `nobleguideacademy.com`,
`darusalamacademy.com` all hold page one. Here the competitors are peers, not
publishers, and the query wants a school rather than a comparison.

**This is where SHRS should compete hardest**, and it happens to be where the
institution is genuinely differentiated: a hifz pathway combined with a secular
curriculum is rare, and searched for by parents who want exactly that.

Direct competitors identified: **Scholars International Tahfiz Academy**
(Cambridge + hifz), **Noble Guide Academy** (Cambridge accredited, Abuja),
**Daarus Salam Tahfidh International Academy** (Alimosho, Lagos, founded
2016 — same state, same year), **Al-Izzah**.

### How AI systems decide what to cite

Different engines, different logic — optimising for one does not deliver the
others:

- **Google AI Overviews** lean on conventionally ranked, E-E-A-T-strong pages;
  seoClarity's analysis of 432,000 keywords found **97% cite at least one
  source from the organic top 20**. Moz's analysis of ~40,000 queries found the
  opposite for **AI Mode**: 88% of citations came from *outside* the organic
  top 10. These are different surfaces and should not be conflated.
- **ChatGPT** skews to established editorial sources — one analysis puts
  Wikipedia at 47.9% of its top-10 citations.
- **Perplexity** weights freshness and community sources heavily, with Reddit
  in 46.7% of top citations.
- Across engines, **page quality is the strongest single predictor** of being
  cited (a September 2025 arXiv study of 1,702 citations put the odds ratio at
  4.2), with metadata and freshness, semantic HTML and structured data as the
  associated signals.

Practical consequence: **the structured-data and semantic-HTML work is not
only for Google.** It is the substrate answer engines parse. And an
institution's own site will rarely be cited for a comparison question — it will
be cited for the specific, factual, first-party questions only the school can
answer.

### Structured data in 2026

Google retired the rich results for seven types in June 2025 and added a
deprecation notice for **FAQ on 7 May 2026**. This directly weakens a
recommendation in the previous version of this document, which listed
"FAQPage per cluster" as a priority.

The correction: **`FAQPage` no longer produces a rich result, so it is no
longer a SERP-feature play.** The markup remains valid, causes no harm, and is
still useful as machine-readable structure for answer engines. Build the FAQ
content because parents need the answers — not for stars in a search result
that no longer appear.

### Local ranking, and what it weighs

Relevance, distance and prominence. The 2026 Local Search Ranking Factors work
puts **Google Business Profile signals at ~32%** of Local Pack weight, with
**primary category the single strongest factor**, reviews at ~20% and
behavioural signals ~9%. NAP must be byte-identical across the profile, the
site and every directory.

**Sources:** [Google Search Central — Organization structured
data](https://developers.google.com/search/docs/appearance/structured-data/organization) ·
[Google — Creating helpful, people-first
content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) ·
[Search Engine Journal — Google is not diminishing structured data in
2026](https://www.searchenginejournal.com/google-is-not-diminishing-the-use-of-structured-data-in-2026/560516/) ·
[FAQ rich results deprecated, May
2026](https://www.getpassionfruit.com/blog/what-changed-with-google-drops-faq-rich-results-and-what-to-do-now) ·
[How AI search engines decide what to
cite](https://authoritytech.io/blog/how-ai-search-engines-decide-what-to-cite) ·
[Leapd — How ChatGPT, AI Overviews and Perplexity source information in
2026](https://www.leapd.ai/blog/ai-visibility/how-chatgpt-google-ai-overviews-and-perplexity-source-information-in-2026) ·
[BrightLocal — Google's local algorithm and ranking
factors](https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/) ·
[DataReportal — Digital 2026:
Nigeria](https://datareportal.com/reports/digital-2026-nigeria) ·
[Legit.ng — best secondary schools in
Lagos](https://www.legit.ng/1112886-top-secondary-schools-lagos.html) ·
[Edusko — top private schools in
Ikorodu](https://www.edusko.com/blog/top-10-best-private-schools-ikorodu)

**A limit on this research:** the sandbox's egress proxy blocked direct fetches
of `developers.google.com` and several publisher domains. Findings attributed
to those came through search result summaries rather than the primary page.
Anything load-bearing should be confirmed against the primary source before it
is acted on.

---

## 3. The keyword intelligence database

`docs/keyword-database.csv` — **15,597 keywords**, built by
`scripts/keyword-build.mjs`, with the columns the brief asked for: intent,
funnel stage, difficulty, opportunity, commercial value, parent intent,
geography, related entities, suggested page, internal links, priority.

### The honesty problem, and how it is handled

**There is no keyword tool connected to this machine** — no Ahrefs, no
Semrush, no Keyword Planner, no Search Console. So there is **no search volume
column**, because inventing one would produce authoritative-looking fiction
that then gets planned against.

`difficulty`, `demand` and `opportunity` are **modelled** by a stated function
in the generator's header, informed by the SERPs actually inspected. When
Search Console is connected, real impressions replace the model.

### The model's first version was wrong, and the correction is instructive

It scored *"low cost muslim school in aga ikorodu"* at **100/100** — trivially
easy to rank for, and nothing in the model asked whether anyone searches it.
**Easiness without demand is not opportunity; it is an empty page.** Opportunity
is now a product rather than a sum, so a zero in any term is a zero overall,
and qualifiers are rationed by how people actually speak — at village scale a
parent names the type and the place and stops.

| Priority | Count | Meaning |
|---|---:|---|
| P1 | 434 | Build for these first |
| P2 | 918 | The following two quarters |
| P3 | 3,141 | Coverage, as clusters mature |
| P4 | 11,104 | Mapped, not scheduled — includes the 570 flagged directory SERPs |

---

## 4. The topical map

`docs/topical-map.md`, generated from the same database so the two cannot
drift. Ordered by total modelled opportunity per cluster, not keyword count —
a large cluster of unwinnable terms is not a large opportunity.

| Cluster | Keywords | P1 | Why it ranks here |
|---|---:|---:|---|
| Qur'an, hifz and tajwīd | 2,285 | 119 | Strongest available position — these SERPs rank school sites |
| Nursery and primary | 2,205 | 65 | Local, high-conversion, short decision cycle |
| Islamic and Arabic studies | 1,936 | 56 | Same logic as Qur'an; peers, not publishers |
| The school as a whole | 2,205 | 12 | Mostly directory SERPs — win via citations, not pages |
| Secondary / Royal College | 1,764 | 22 | Longer cycle, higher value per enrolment |
| Cambridge and international | 1,828 | 21 | Crowded by established international schools |
| Boarding and pastoral care | 986 | 28 | Under-served nationally; strong diaspora overlap |
| Choosing a school | 114 | 0 | No commercial intent, highest answer-engine citation potential |
| Fees and value | 66 | 0 | **The page that does not exist yet** |

---

## 5. Information architecture

The current architecture is sound — five institutions under `/academics/`,
breadcrumbs on 139 pages, a flat and readable URL scheme. It has three gaps,
all of them content rather than structure:

1. **`/admission/fees/` does not exist.** Fees is the single most-searched
   question a Nigerian parent has, and the one most schools refuse to answer
   on-site. Every fee keyword in the database routes to a page that must be
   created.
2. **No press or news section a crawler can reach.** Three Punch articles exist
   and nothing on the site links to them.
3. **No neighbourhood pages** — and they should only be built for areas the
   school genuinely serves. Inventing catchment pages is how a site earns a
   doorway-page penalty.

Do **not** restructure what works. Every URL change costs redirect equity, and
this site's structure is not what is holding it back.

---

## 6. Content architecture

Each cluster gets a pillar page that already exists, plus the pieces below it.
Format matters as much as subject: **question as the heading, answer in the
first forty words, then the detail.** That is what gets quoted by an answer
engine, and citation is the new first position.

- **Fees & value** — fee structure, what is included, payment plans,
  scholarships, and an honest comparison to the Lagos range
- **Qur'an** — the hifz pathway, tajwīd, how memorisation is verified, how
  hifz and Cambridge run in one timetable
- **Curriculum** — Cambridge vs WAEC/NECO, how the Islamic and secular streams
  combine
- **Boarding** — a day in the life, safeguarding, pastoral care, meals,
  visiting
- **Admissions** — how to apply, entrance assessment, mid-term entry, documents
- **Choosing a school** — the awareness cluster: what to look for, questions to
  ask on a tour, how to verify a school is registered in Lagos
- **Outcomes** — results, university destinations, the graduate profile

Comparison and decision pages carry real weight here and almost no Nigerian
school writes them.

---

## 7. Local SEO — the highest-value work, and it is not code

None of it is controlled from this repository:

1. **Claim and verify the Google Business Profile.** ~32% of Local Pack weight,
   and the primary category is the strongest single factor. Use *Islamic
   school* + *Private educational institution*.
2. **Reviews from real families.** ~20% of weight; volume and recency both
   count. Ask at parents' evenings and after graduations.
3. **NAP, byte-identical everywhere:**
   `Sultan Hanafi Royal Schools · 15 Imowonla Road, AP Bus Stop, Off
   Gberigbe–Agura Road, Ikorodu, Lagos State · +234 807 374 7650`
4. **Citations, and these are ranking levers here** because Ikorodu SERPs are
   directory SERPs: NAPPS, Edusko, nigeriaprivateschools.com, VConnect,
   Finelib, infoisinfo. The school is already listed on `ng-check.com` and
   `nigeria24.me` via its CAC registration — those confirm the entity but do
   not compete.

---

## 8. International SEO

The `hreflang` implementation is correct and verified: 105 alternates, zero
broken, each checked against disk. Keep that discipline — **do not add a
language cluster before its pages exist.**

The real international opportunity is narrow and valuable: **diaspora families
placing a child in a Nigerian Islamic boarding school** — from the UK, US,
Canada, and the Gulf. Almost uncontested, high value per enrolment, and it is
already in the database as its own segment.

Do not machine-translate at scale to chase it. Translated pages without
editorial review are exactly what Google's guidance on scaled content abuse
targets.

---

## 9. AI search optimisation

Given the citation logic in §2, the practical programme:

- **Be the primary source for first-party facts.** Fees, curriculum
  structure, hifz methodology, admission requirements. No other site can
  answer these, so a well-structured answer has no competitor.
- **Answer-first formatting**, as in §6.
- **Semantic HTML and structured data**, which the research associates with
  citation across engines — now installed.
- **Freshness**, which Perplexity weights heavily. A page updated annually is
  a page that keeps its citation.
- **Earned mentions**, which is what ChatGPT's editorial-source bias actually
  rewards. Press coverage does more for AI visibility than on-page work.
- Do not expect to be cited for *"best school in Lagos"*. Expect to be cited
  for *"does Sultan Hanafi teach Cambridge alongside hifz"*.

---

## 10. Authority building

The genuinely newsworthy material already exists and is not being used: the
N1.5m Qur'an competition, graduation cohorts, and the digital campus work.

- **Digital PR** to Nigerian education desks — Punch has run three pieces
  already, which means the relationship exists.
- **Original data** is the strongest link asset available and nobody in this
  market publishes it: an annual *Lagos Islamic Education Report* on fees,
  enrolment and hifz outcomes would be cited rather than merely read.
- **Free resources for teachers and parents** — a hifz progress tracker, an
  admissions checklist, a fee-planning calculator. Useful tools earn links;
  brochures do not.

---

## 11. Analytics

Nothing in this programme can be managed without measurement, and **none of
the following is currently connected**:

| Measure | Source | Status |
|---|---|---|
| Impressions, clicks, position by query | Google Search Console | **not connected** |
| Local Pack visibility, calls, direction requests | Business Profile Insights | **profile not claimed** |
| Enquiries by channel | Site analytics + WhatsApp click events | not instrumented |
| Applications started / completed | `/admission/apply/` funnel | not instrumented |
| Core Web Vitals, field data | CrUX / Search Console | **not connected** |
| AI citations | manual prompt panel, monthly | not started |

**Connect Search Console before anything else.** Until it is connected, every
number in §3 stays modelled, and this programme is flying on instruments it
built for itself.

---

## 12. Forecasts

Three scenarios, with the assumptions that break each. **No ranking, traffic
or enquiry number here is a promise.**

| Horizon | Conservative | Expected | Best case |
|---|---|---|---|
| Weeks 1–4 | 42 pages indexed; entity recognised | + long-tail impressions begin | + first Maps impressions |
| Months 2–3 | 3–8 long-tail terms in top 10 | 15–30 in top 10 | Qur'an/hifz cluster enters top 10 |
| Months 4–6 | steady brand + long-tail enquiry flow | *Ikorodu* and *Islamic school* clusters top 3 | *hifz school Lagos* top 5 |
| Months 6–12 | compounding | Qur'an cluster owned locally | national visibility in the tahfiz niche |

**Assumptions, any of which can fail:** that the domain conflict in §0.1 is
resolved; that the Business Profile is claimed and verified; that reviews are
solicited from real families; that the fee page is published; that the content
calendar is actually maintained; that no manual action or technical regression
occurs; that competitors do not simultaneously invest.

**What is NOT in any column:** *best school in Lagos*, *best school in
Nigeria*, *best Islamic school in Nigeria*. Those SERPs are lists. The
corresponding goal — appearing *in* the lists — is in §7.

### On "500 enquiries in two weeks"

Not achievable through SEO, and no honest programme should be sold on it. A
page must be crawled, indexed, and then earn position against incumbents who
have been accumulating authority for years.

Two weeks is enough for exactly one thing: **being correctly indexed and
correctly described.** That is what has been built. If 500 enquiries are needed
on that timescale, the instrument is paid acquisition — Meta and Google Ads to
Ikorodu and Lagos parents — with this work underneath it so the landing pages
convert and the cost per enquiry falls over time.

---

## 13. In order, from here

1. **Resolve the domain conflict** (§0.1). Nothing else returns as much.
2. **Claim and verify the Google Business Profile.** *(not code)*
3. **Connect Search Console**, and submit the sitemap. *(not code)*
4. **Publish the fee page** — the highest-intent unanswered query in the market.
5. **Get listed** in NAPPS, Edusko, nigeriaprivateschools.com, VConnect.
6. **Link the Punch coverage** from a press section on the site.
7. **`srcset` + WebP**, with a visual QA sweep beside it (§1).
8. **Solicit reviews** from real families.
9. **The content clusters** in §6, in the order of §4.
10. **Original research publication**, once there is data worth publishing.

Items 1 to 3 are worth more than everything below them combined, and none of
the three is something a repository can do for you.
