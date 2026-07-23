# Sultan Hanafi Royal Schools — Flagship Site

Static, no-framework build. See `docs/editorial-bible.md` for the brand
system and `docs/site-architecture.md` for the planned multi-page site
map (not yet built out beyond the shared chrome described below).

## Structure

```
index.html            Built output — do not hand-edit, regenerate instead
css/brand.css          Shared design system (palette, type, all page CSS)
js/site.js             Shared behaviour (policy accordion, scroll-reveal)
assets/images/         Crest and watermark art, referenced by root-relative paths
partials/              Shared chrome, reused by every page
  head.html             <head> contents, with {{TITLE}} / {{DESCRIPTION}} tokens
  topbar.html            Top contact/social bar
  header.html            Logo + primary nav
  footer.html            Site footer
pages/                 One content file per page (page body only, no chrome)
  home.html              Current single-page content (all sections)
  manifest.json           Registers each page: slug, output path, title, description, content file
scripts/build.js       Assembles partials + a page's content into a full
                       HTML document for every entry in pages/manifest.json
```

## Adding a page

1. Write the page's unique content (no `<head>`, topbar, header, or
   footer — those come from `partials/`) into a new file under `pages/`.
2. Add an entry to `pages/manifest.json` with a `slug`, the `output`
   path (e.g. `academics/royal-college.html`), a `title`, a
   `description`, and the `contentFile` you just wrote.
3. Run the build.

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

then open `http://localhost:8000/`. Asset and stylesheet references are
root-relative (e.g. `/css/brand.css`), so the site must be served — it
will not render correctly opened directly as a `file://` URL.
