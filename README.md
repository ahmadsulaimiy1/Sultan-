# Sultan Hanafi Royal Schools — Flagship Site

Static, no-framework, bilingual build. See `docs/editorial-bible.md` for
the brand system and `docs/site-architecture.md` for the full site map
(English and Arabic, both complete).

## Structure

```
index.html, about/, academics/, ...   Built English pages — do not hand-edit, regenerate instead
ar/                                    Built Arabic (RTL) mirror of every English page
css/brand.css          Shared design system (palette, type, RTL overrides, all page CSS)
js/site.js             Shared behaviour (policy accordion, scroll-reveal)
assets/images/         Crest and watermark art, referenced by root-relative paths
partials/              Shared chrome, reused by every page
  head.html             <head> contents, with {{TITLE}} / {{DESCRIPTION}} tokens (shared, both languages)
  topbar.html            Top contact/social bar (English), with {{ALT_HREF}} language-switcher token
  topbar.ar.html         Arabic counterpart
  header.html / header.ar.html   Logo + primary nav, per language
  footer.html / footer.ar.html   Site footer, per language
pages/                 One content file per page (page body only, no chrome)
  home.html, about.html, ...        English content
  home.ar.html, about.ar.html, ...  Arabic content (same slug + .ar suffix)
  manifest.json           Registers every page: slug, output path, title,
                           description, content file, and (for non-English
                           pages) lang/dir/altHref
scripts/build.js       Assembles partials + a page's content into a full
                       HTML document for every entry in pages/manifest.json
```

## Adding an English page

1. Write the page's unique content (no `<head>`, topbar, header, or
   footer — those come from `partials/`) into a new file under `pages/`.
2. Add an entry to `pages/manifest.json` with a `slug`, the `output`
   path (e.g. `academics/royal-college/index.html` for a clean URL), a
   `title`, a `description`, and the `contentFile` you just wrote. Set
   `altHref` to that page's Arabic counterpart path (e.g. `/ar/academics/royal-college/`).
3. Run the build.

## Adding its Arabic counterpart

1. Translate the content into a sibling file with a `.ar` suffix (e.g.
   `pages/academics-royal-college.ar.html` next to
   `pages/academics-royal-college.html`) — full sentences, not
   machine-translated filler. Keep institution names, certification
   acronyms, and any deliberately-Latin brand devices (like "CLEVER") in
   Latin script; wrap phone numbers, emails, and addresses in
   `dir="ltr"` spans (the Unicode bidi algorithm doesn't reliably keep
   embedded numeric/Latin runs in reading order inside RTL text).
2. Add a manifest entry: same shape as the English one, plus
   `"lang": "ar"`, `"dir": "rtl"`, and `altHref` pointing back at the
   English page.
3. Run the build. Font-family needs no per-page attention — Amiri/Cairo
   are appended as fallbacks to every existing font stack in
   `css/brand.css`, so Arabic glyphs render correctly automatically
   while English pages are untouched. If the new page introduces a
   component with a physical `border-left`/`text-align:right`/etc. that
   doesn't already have an RTL counterpart in the `[dir="rtl"]` block at
   the end of `css/brand.css`, add one there.

## Building

```
node scripts/build.js
```

Regenerates every page listed in `pages/manifest.json` from the shared
partials. There are no dependencies to install — the script only uses
Node's built-in `fs`/`path` modules.

## Local preview

```
python3 -m http.server 8000
```

then open `http://localhost:8000/` (or `/ar/` for the Arabic homepage).
Asset and stylesheet references are root-relative (e.g.
`/css/brand.css`), so the site must be served — it will not render
correctly opened directly as a `file://` URL.
