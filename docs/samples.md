# Named samples

Two versions of the site's look, named by the Founder so they can be asked
for by name in a later conversation without describing them again.

Whenever "Sample One" or "Sample Two" is mentioned, it means what is written
here. Do not rename these. If a third is named later, add it below rather
than reusing a name.

---

## Sample One — the coffee one

The coffee-brown chrome. The masthead, the top bar, the rails, the notices
strip, the breadcrumb and the colophon are all mixed from the house browns
(`--navy` `#3B2A1D`, `--navy-deep` `#221709`) with gold laid on top of them.
Warm and dark; the front of the site reads brown.

**Fixed at:** commit `2bd783e`
(*The masthead follows the reader again*) — the last commit before the chrome
was taken to black and gold.

**To see it on the live site today:** Personalisation Centre →
Theme **Royal**, Livery **Coffee Brown**. The gilding added after this commit
is scoped to the Royal livery, so choosing Coffee Brown gives the
coffee-brown chrome from that livery's own tokens.

Note: at the tagged commit this was the *default* — a visitor with no
preference set got it. It is now one of the choices, not the default.

---

## Sample Two — the plain one

The Clear edition. Off-white, ivory and cream chrome, with the gold kept for
the touches: gold hairlines on the plates, gold rings round the medallions,
the gold cell in the quick row, the standing line between two gold rules.
Clean and light; the front of the site reads as paper.

**This is the current default** — what a visitor gets with no preference set.

**Fixed at:** commit `76615f5`
(*The Clear edition becomes the house default*).

**To see it on the live site today:** it is the default. If an edition has
already been chosen on a device, Personalisation Centre → Theme **Clear**.

---

## The third edition, unnamed

**Midnight** (Theme → Midnight) is the dark edition, built separately and
measured to its own contrast. It is neither Sample One nor Sample Two; it has
not been given a sample name because it has not been asked for by one.

---

## Recovering a sample exactly

The two commit hashes above are the durable handle. Both are ancestors of
`main`, so they are part of the repository's permanent history and can be
read at any time, from any clone, for as long as the repository exists.

```sh
git show 2bd783e:css/brand.css          # read one file as Sample One had it
git diff 2bd783e 76615f5 -- css/        # what changed between the two
git checkout -b look/sample-one 2bd783e # work from it, without moving main
```

`main` is never rewound to reach a sample. A sample is restored by bringing
what is wanted forward onto `main`, so nothing built after it is lost in the
process.

**On tags:** annotated tags `sample-one` and `sample-two` were created, but
this environment's GitHub credentials refuse tag pushes (HTTP 403 — they
allow branch pushes only), so the tags exist locally and will not survive the
container. That costs nothing: the hashes above are what matters, and they
are written down here, in a file that is pushed. If tags are wanted on the
remote, they can be created from the GitHub web interface against those two
hashes.
