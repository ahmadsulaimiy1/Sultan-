# URL Migration Map — shroyalschools.ng → shroyalschools.com

Every legacy URL known from any evidence stream, with its disposition. Evidence
column: **NAV** = the captured pages' own navigation; **IDX** = present in the
search index (with snippet); **SRCH** = surfaced by search outside the nav.

Actions: **301** = redirect to the topical equivalent · **MERGE** = redirect,
after its unique content is carried into the target · **INTERIM** = redirect to
the nearest page until the flagged gap page exists.

| Legacy URL | Evidence | Action | Target on `.com` | Notes |
|---|---|---|---|---|
| `/` | NAV, IDX | 301 | `/` | Motto and portal list preserved in inventory |
| `/about/` | NAV | 301 | `/about/` | Direct equivalent |
| `/about-sultan/` | NAV, IDX | MERGE | `/about/` | Saudi-curriculum fact + CLEVER expansion must appear on `.com` first (curriculum page / about) — captured in `content/about-sultan.md` |
| `/directors-speech/` | NAV, IDX | MERGE | `/about/heritage/` | Founder's address verbatim into the heritage archive; capture the full page before cutover |
| `/governance/` | NAV (label) | 301 | `/about/governance/` | URL inferred from nav label — confirm exact slug from WP export |
| `/sultan-hanafi-structure/` | NAV | 301 | `/about/governance/` | Organisational structure |
| `/management-team/` | NAV | MERGE | `/about/governance/` | Biographies into governance/Press Centre first |
| `/lukman/` | SRCH, IDX | MERGE | `/press/` | Biography into executive biographies; **hunt sibling profile pages via WP export** |
| `/career/` | NAV | INTERIM | `/contact/` | **Gap: `.com` needs `/careers/`** — retarget when built |
| `/policies/` | NAV | 301 | `/policies/` | Direct equivalent |
| `/sultan-hanafi-nursery-and-primary-school/` | NAV, IDX | 301 | `/academics/nursery-primary/` | Confirm ages 2–10 + play-based pedagogy present on target |
| `/sultan-hanafi-royal-college` and `/sultan-hanafi-royal-college/` | NAV (both forms) | 301 | `/academics/royal-college/` | Both slash variants seen in the wild |
| `/school-of-islamic-and-arabic-studies/` | NAV | 301 | `/academics/arabic-islamic-studies/` | Saudi-curriculum statement belongs on target |
| `/sultan-hanafi-quran-college/` | NAV | 301 | `/academics/quran-college/` | Direct equivalent |
| `/admission/` | NAV | 301 | `/admission/` | Direct equivalent |
| `/boarding/` | NAV | 301 | `/boarding/` | Direct equivalent |
| `/facilities/` | NAV | 301 | `/facilities/` | Direct equivalent |
| `/foundation/` | NAV | 301 | `/foundation/` | Direct equivalent |
| `/gallery/` | NAV | 301 | `/gallery/` | Capture captions before cutover |
| `/video-gallery/` | NAV | 301 | `/gallery/` | `.com` gallery absorbs video until a dedicated section exists |
| `/news-events/` | NAV | MERGE | `/press/` | The news archive is the commissioning/competition record — capture every post first |
| `/contact/` | NAV, IDX | 301 | `/contact/` | Legacy emails documented in inventory |
| `/wp-content/uploads/…` | NAV (assets) | keep serving 12 months | — | Then 301 the directory to `/gallery/`; never 404 images on day one |
| `/wp-json/…`, `/?p=…`, feeds | WP internals | 410 after 90 days | — | Machine endpoints, no equity |
| anything unmatched | — | 301 | `/` | Last resort only — the rules above go first |

## Not represented yet — pending WP export

Individual news posts under `/news-events/`, any sibling profile pages beside
`/lukman/`, tag/category archives, and PDF uploads. The WordPress
`Tools → Export` list closes this; every post found gets a row here before
cutover.
