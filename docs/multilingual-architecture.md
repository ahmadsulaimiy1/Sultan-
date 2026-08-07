# Multilingual architecture

Production languages: **English** (default), **Arabic**, **Yorùbá**, **French**.

This document covers the internationalisation system itself — how a language
is added, where strings live, how the switcher works, and what is not yet
translated. For the brand system see `editorial-bible.md`; for the site map
see `site-architecture.md`.

## Why the previous approach was replaced

Arabic was implemented as **duplication**, not internationalisation:
`pages/manifest.json` held 36 English content files and 35 hand-written
Arabic twins, every shared partial existed twice (`header.html` /
`header.ar.html`), and the switcher was a single `{{ALT_HREF}}` token — a
binary A↔B toggle with no concept of a third language.

That model does not extend. Two more languages would have meant ~140 more
hand-maintained files, and any fix applied to one copy silently skips the
others. It already had: the Arabic navigation shipped an untranslated
"Create a Parent Account" because the string was fixed in `header.html` and
never mirrored into `header.ar.html`.

## The model now

```
i18n/locales.json          Locale registry — the single source of truth
i18n/en.json               Default-locale dictionary; defines the key contract
i18n/ar.json               One flat, dot-keyed dictionary per language
i18n/yo.json
i18n/fr.json
lib/i18n.js                Locale maths, shared verbatim with the browser
js/i18n.js                 The live switcher
js/locale-registry.js      GENERATED from i18n/locales.json — do not edit
js/i18n-core.js            GENERATED from lib/i18n.js — do not edit
css/i18n.css               Per-locale typography + switcher styling
partials/<name>.tpl.html   Language-neutral chrome carrying {{t:key}} tokens
```

`lib/i18n.js` is copied into `js/` at build time rather than reimplemented,
so the switcher's idea of "the Yoruba URL for this page" is byte-for-byte the
build's. A switcher that disagrees with the build sends readers to 404s.

### Adding a language

1. Add an entry to `i18n/locales.json` (code, `pathPrefix`, `dir`,
   `intlLocale`, `nativeName`, `fontStack`).
2. Copy `i18n/en.json` to `i18n/<code>.json` and translate the values.
3. `npm run build`.

That is the whole procedure. The build derives the page list, the URL tree,
the breadcrumbs, the `hreflang` set, the search index and the switcher entries
from the registry. Nothing else needs editing — which is the point.

### Adding or changing a string

Add the key to `i18n/en.json` **and every other dictionary**. The build runs
`scripts/i18n-check.js` before writing anything and aborts if the
dictionaries are not in parity, because a missing key renders as
`⟦nav.academics⟧` on a live page and the build would otherwise succeed.

`scripts/i18n-check.js` also catches:

- **placeholder drift** — `{min}` present in English but dropped or renamed
  in a translation, so the number never appears in that language;
- **untranslated copies** — a non-default value byte-identical to English on
  a string long enough that coincidence is implausible (a warning; use
  `npm run i18n:check:strict` to fail on these);
- **Yoruba diacritic stripping** — see below.

### Chrome templates

`scripts/i18n-templatise.js` converted the English chrome partials into
`*.tpl.html` files carrying `{{t:key}}` tokens. It substitutes only complete
text nodes and a small allow-list of human-visible attributes, never partial
words or `href`/`class`/`src`, and it **verifies** its own output: rendering
the template back in English must reproduce the original file byte for byte,
or nothing is written.

`readPartial()` in `scripts/build.js` prefers, in order:
`<name>.tpl.html` → `<name>.<lang>.html` → `<name>.html`. The template wins
over a hand-authored copy because the template is the one that cannot drift.

Chrome still falling back to English on a translated page is **reported at
the end of every build**, so the gap is visible rather than silently
permanent.

## The switcher

`js/i18n.js` picks a strategy per page:

- **Instant** — the page carries `[data-i18n]` attributes (the portal pages).
  Text is rewritten in place, `dir`/`lang` flip, the URL is untouched. No
  reload, so an open form keeps its values, a dashboard keeps its fetched
  data, and the session cookie is never re-negotiated.
- **Navigate** — the page is a pre-rendered static document whose prose only
  exists in the locale tree (the public site). The translated text is a
  different file, so a navigation is unavoidable; the switcher navigates to
  **the same page** in the target language, carrying the query string and
  hash, so the reader lands where they were.

The control is a native `<details>` disclosure: keyboard-operable,
screen-reader-announced and Escape-closable without JavaScript, with a
`<noscript>` link so the site is never trapped in one language.

Preference is written to **both** `localStorage` and a one-year `SameSite=Lax`
cookie, so an edge function or future server render can honour it before any
JavaScript runs.

On arrival the switcher only moves a visitor who has **previously made an
explicit choice**, only once per tab. A blanket `Accept-Language` redirect is
deliberately avoided: it hides the English canonical from crawlers and
overrides visitors who want the other edition.

## Typography

The three font roles (`--font-display`, `--font-label`, `--font-body`) are
declared once in `css/brand.css` and consumed by all 153 rules across
`brand.css`, `prestige.css`, `elevate.css`, `menu.css`, `motion.css`,
`announcements.css`, `apply.css`, `personalisation.css` and `idcard.css` that
previously hardcoded a stack. Per-language typography is therefore a variable
swap in `css/i18n.css`, not a parallel stylesheet.

### Yoruba needs its own face

**None** of Cormorant Garamond, Cinzel, Inter or Amiri contains `ẹ` (U+1EB9),
`ọ` (U+1ECD) or `ṣ` (U+1E63). Without a face that does, every Yoruba page
falls back to a system font for exactly those letters, so a single word —
*Ìgbésí-ayé Akẹ́kọ̀ọ́* — renders in two typefaces, breaking at the letters
that carry meaning. This is not cosmetic: *ọkọ̀* (vehicle) and *oko* (farm)
are different words, not spelling variants.

`assets/fonts/charis-sil-yoruba-*.woff2` is Charis SIL — drawn by SIL
International for African orthographies — merged from three Fontsource
subsets and cut down to the exact Yoruba repertoire (~15 KB per weight, with
the `mark`/`mkmk` GPOS features intact so a tone mark stacks cleanly above an
underdot rather than colliding with it). Rebuild with
`scripts/build-yoruba-font.py`; the output is committed, so a normal build
never needs it.

The parity checker guards this: a Yoruba dictionary whose substantial strings
have lost their diacritics fails the build. Diacritic stripping by an editor,
a copy-paste or a spell-checker is the most common way Yoruba text gets
mangled, and it is invisible in review.

### French

Uses the same Latin typography as English, declared explicitly rather than
inherited so a future change to English does not silently move French.
Dictionary values use French typographic convention: narrow no-break space
before `?` and `:`, guillemets `« … »` with no-break spaces inside.

## Locale-aware formatting

`SHRS_LOCALE.formatDate/formatNumber/formatCurrency` are exposed globally for
scripts rendering dynamic content. Two deliberate behaviours:

- Yoruba is not in every runtime's CLDR data. Requesting `yo-NG` where it is
  unsupported silently yields the runtime default, printing **English** month
  names inside a Yoruba page. `resolveIntlLocale()` verifies the request was
  honoured and falls back to the locale's declared `numberFallback` instead.
- Fees are denominated in Naira regardless of reading language — switching to
  French must not imply the invoice is in euros. The currency **code** is
  fixed per locale in the registry; only the **formatting** follows the
  language.

## Performance

Only the active language's resources load. Static pages are pre-rendered in
their language and fetch **no dictionary at all** — the public site pays
nothing at load time for this system. Instant-mode pages fetch one dictionary
on demand and cache it. The Yoruba font downloads only on pages that select
it. Generated runtime files live under `js/`, so they pick up the existing
content-hash cache-busting automatically.

## What is not yet translated

Stated plainly so the gap is scoped rather than assumed closed.

| Area | Status |
| --- | --- |
| Navigation, topbar, footer, breadcrumbs, search chrome | Translated, all 4 languages |
| Buttons, form labels, validation messages, state messages | Translated, all 4 languages |
| Public page **body content**, Yorùbá + French | English, behind a translated interim notice |
| Portal mega-menu prose (~75 strings in `header.tpl.html`) | English in all but Arabic |
| `partials/assistant.*`, `partials/personalisation.*` | English for Yorùbá + French (reported each build) |
| Portal UI (69 pages, ~9,800 lines of JS) | English; `js/portal-theme.js` carries a 7-key Arabic chrome dictionary |
| Emails, PDFs, certificates, reports | English / existing bilingual behaviour unchanged |

Pages with untranslated bodies are generated with fully translated chrome and
a visible, translated notice linking to the English edition, so `hreflang`
and the switcher never point at a URL that does not exist. Authoring a real
manifest entry for a page overrides the derived one and removes the notice
for that page alone.
