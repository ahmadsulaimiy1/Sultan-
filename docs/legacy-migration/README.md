# Legacy Site Migration — shroyalschools.ng → shroyalschools.com

The audit, the preservation record, and the retirement plan for the school's
first website. **Decided 15 Aug 2026: `.com` is the single authoritative
digital home; `.ng` is an archival source.**

## How this audit was performed, and its limits

The `.ng` host, `web.archive.org` and `punchng.com` are all unreachable from
this environment, so the audit runs on three instruments, each with a stated
limit:

1. **Browser captures** (`captures/*.mhtml`), supplied by the school and
   extracted by `scripts/legacy-extract.py`. Complete and authoritative for
   every captured page — and only for those pages.
2. **The search index** — 118 `site:`/keyword queries across five angles.
   Authoritative for *what Google currently holds* (which is exactly the set
   that matters for redirect equity), but it returns titles and snippets, not
   full pages. **6 distinct URLs are indexed.**
3. **The captured pages' own navigation** — 21 distinct content URLs, the
   site's declared structure.

**No backlink tool is connected**, so the backlink assessment is search-based
and marked NOT CONFIRMED where the referring page could not be fetched. The
finding, for what it is worth: no fetched or snippeted source was seen linking
the `.ng` URL itself — the Punch articles appear to name the school without
linking it. The migration's link-equity exposure is therefore probably small,
but "probably" is the honest word.

## What the legacy site is

WordPress (LiteSpeed cache, uploads dated from Dec 2023), built by Tade iHub.
21 content pages in its navigation, of which Google indexes 6. It carries the
school's earlier identity chain — **`shrschools.ng` → `shroyalschools.ng` →
`shroyalschools.com`** — evidenced by `principal@shrschools.ng` on its contact
page, plus a second phone number (`08038078664`) and the legacy email identity
`info@shroyalschools.ng`.

## Historical content inventory — what must survive

| Content | Where it lives | Status |
|---|---|---|
| Founder's welcome address, in his voice, with full credentials | `/directors-speech/` | **Capture needed** — only a snippet preserved so far |
| Saudi Arabian curriculum adoption (Islamic & Arabic School, Qur'an College) | `/about-sultan/` | **Preserved** (`content/about-sultan.md`) |
| CLEVER values, full expansion | `/about-sultan/` | **Preserved** |
| Mission & vision, verbatim | `/about-sultan/` | **Preserved** |
| Motto "We Nurture Tomorrow's Leaders" | homepage | Snippet only — capture needed |
| Leadership biographies (Mr. Lukman Anofi: CPA, New Brunswick, Lean Six Sigma Black Belt) | `/lukman/`, `/management-team/` | Snippet only — capture needed; **more unindexed profile pages likely exist** |
| News & events archive (commissioning, competitions, visits — with dates) | `/news-events/` + individual posts | **Capture needed — highest priority** |
| Legacy contact identities (`info@shroyalschools.ng`, `principal@shrschools.ng`, `08038078664`) | `/contact/` | Snippet preserved |
| CAC registered office: "Sultan House, 21, H Road, Olaife Estate, Imowonla Town" | ng-check.com registry mirror | Documented here — the *legal* address, distinct from the campus address; belongs in the archive, **not** in the Maps entity |
| Gallery captions and historic photographs | `/gallery/`, `/video-gallery/` | Capture needed |
| Nursery & Primary programme description (ages 2–10, play-based) | `/sultan-hanafi-nursery-and-primary-school/` | Snippet preserved; `.com` equivalent exists |

## SEO equity assessment

- **Indexed surface: 6 URLs.** The equity at stake is small and concentrated
  on the homepage and the institution/about pages.
- **Brand equity is the real asset**: the `.ng` site is what Google currently
  returns for the school's name. The migration's purpose is to move that
  association, and page-by-page 301s are how it moves without loss.
- **Syndication found**: the Punch Qur'an-competition article is mirrored on
  MSN — a second national citation for the archive.
- **Founder's LinkedIn** (`ng.linkedin.com/in/zakariya-olanrewaju-anofi-…`)
  plausibly cites the `.ng` site as official — it should be updated to `.com`
  on cutover day, and it is a `sameAs` candidate for the founder's Person node
  once the school confirms it.

## URL migration map

The full page-by-page table: [`migration-map.md`](migration-map.md).
The deployable rules for the `.ng` WordPress host:
[`redirects.htaccess`](redirects.htaccess).

Principles applied: every URL goes to its topical equivalent, never to the
homepage when a closer match exists; nothing is retired that has content
nowhere else; `/wp-content/uploads/` is kept serving through a transition year
rather than broken on day one.

## New pages the `.com` site needs (gaps the legacy site exposed)

1. **`/careers/`** — the legacy site has one; `.com` has none. Until it
   exists, `/career/` redirects to `/contact/` (flagged as interim).
2. **Executive biographies** — `/lukman/` and `/management-team/` have no
   `.com` home; the Press Centre will carry them.
3. **A news/events archive** — `/news-events/` maps to `/press/` once the
   Press Centre carries dated coverage.
4. **The heritage archive** (`/about/heritage/`) — where the founder's
   address, the identity chain, and the commissioning record will live.

## Risks of retiring the legacy site

1. **Re-crawl lag.** Even clean 301s take weeks–months to transfer signals.
   Mitigation: keep the `.ng` registration and redirects live indefinitely —
   a domain renewal is cheaper than the equity it protects.
2. **Domain expiry → impersonation.** If `shroyalschools.ng` (or the older
   `shrschools.ng`) lapses, a third party can register it and inherit the
   school's residual trust. **Renew both, permanently.** This is a
   safeguarding matter as much as an SEO one.
3. **Email continuity.** `info@shroyalschools.ng` is printed in registry
   filings and likely on paper. Keep the mailbox alive (or forwarding) for
   years, not months.
4. **Unindexed pages.** `/lukman/` proves per-person pages exist outside the
   navigation and the index. Before cutover, someone with WP admin access
   should export the full page/post list (`Tools → Export`) — the only
   complete enumeration possible.
5. **Bookmarked legacy portals.** The old homepage advertised five login
   portals; users with bookmarks will hit dead ends — the redirect rules send
   them to `/portal/select/`.
6. **Content that exists nowhere else** — the Director's Speech and the news
   archive, until captured, exist only on a site scheduled for retirement.

## Cutover checklist (for whoever holds the `.ng` WordPress admin and DNS)

1. Export the full WP content list (`Tools → Export`) and send it here — closes
   the unindexed-page gap.
2. Capture the remaining pages as `.mhtml` (priority order in the inventory
   above) and upload them for extraction.
3. Deploy `redirects.htaccess` on the `.ng` host (or enter the same rules in
   the Redirection plugin).
4. Update the LinkedIn profile, social bios, and any directory listings from
   `.ng` to `.com`.
5. In Google Search Console: verify both properties, then use the Change of
   Address tool `.ng` → `.com`.
6. Keep both domain registrations and the `info@` mailbox alive indefinitely.
