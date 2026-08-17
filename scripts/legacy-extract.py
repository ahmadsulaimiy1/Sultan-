#!/usr/bin/env python3
"""
=============================================================================
LEGACY EXTRACT — preserve a captured page of the retiring .ng website
=============================================================================

The legacy site (shroyalschools.ng, WordPress) is being retired in favour of
shroyalschools.com. This sandbox cannot reach the .ng host or web.archive.org,
so preservation runs on BROWSER CAPTURES: someone with ordinary access saves
each page (Chrome: Save Page As -> "Webpage, Single File" -> .mhtml) and drops
it into docs/legacy-migration/captures/. This script turns every capture into:

    docs/legacy-migration/content/<slug>.md     readable text, with provenance
    docs/legacy-migration/assets/<original>     every embedded image, original
                                                filename kept, deduplicated by
                                                content hash

Nothing is ever overwritten with less: a re-run only replaces an extraction if
the capture is newer. The .mhtml originals stay in captures/ as the archival
record — the .md is a reading copy, not a substitute.

    python3 scripts/legacy-extract.py
=============================================================================
"""
import email, hashlib, html as H, re, sys
from email import policy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAP = ROOT / "docs/legacy-migration/captures"
OUT = ROOT / "docs/legacy-migration/content"
ASSETS = ROOT / "docs/legacy-migration/assets"

for d in (CAP, OUT, ASSETS):
    d.mkdir(parents=True, exist_ok=True)

BLOCK = re.compile(r"<(h[1-6]|p|li|blockquote|figcaption|td|th)[^>]*>([\s\S]*?)</\1>")
PREFIX = {"h1": "# ", "h2": "## ", "h3": "### ", "h4": "#### ", "h5": "##### ",
          "h6": "###### ", "p": "", "li": "- ", "blockquote": "> ",
          "figcaption": "*Caption:* ", "td": "| ", "th": "| **"}

def text_of(fragment: str) -> str:
    t = H.unescape(re.sub(r"<[^>]+>", " ", fragment))
    # Mojibake from double-encoded UTF-8 punctuation in the WP theme.
    t = t.replace("���", "'").replace("â€™", "'")
    return re.sub(r"\s+", " ", t).strip()

def extract(mht: Path):
    msg = email.message_from_bytes(mht.read_bytes(), policy=policy.default)
    page_url = msg.get("Snapshot-Content-Location", "")
    saved = msg.get("Date", "")
    subject = msg.get("Subject", mht.stem)

    html_part, images = None, []
    for part in msg.walk():
        ct = part.get_content_type()
        if ct == "text/html" and html_part is None:
            html_part = part.get_content()
        elif ct.startswith("image/"):
            images.append((part.get("Content-Location", ""), part.get_payload(decode=True)))

    if html_part is None:
        print(f"  SKIP {mht.name}: no text/html part"); return None

    h = re.sub(r"<script[\s\S]*?</script>", "", html_part)
    h = re.sub(r"<style[\s\S]*?</style>", "", h)
    # Drop nav/header/footer chrome so the reading copy is the page's own copy.
    h = re.sub(r"<(header|nav|footer)[\s\S]*?</\1>", "", h)

    seen, lines = set(), []
    for m in BLOCK.finditer(h):
        t = text_of(m.group(2))
        if len(t) < 3 or t[:70] in seen: continue
        seen.add(t[:70])
        lines.append(PREFIX[m.group(1)] + t)

    links = sorted(set(re.findall(r'href="(https://shroyalschools\.ng/[^"#?]*)"', html_part)))
    links = [l for l in links if "/wp-content/" not in l and "/wp-json/" not in l]

    kept = []
    for loc, data in images:
        if not data or len(data) < 2048: continue
        name = loc.rsplit("/", 1)[-1] or hashlib.sha256(data).hexdigest()[:12]
        dest = ASSETS / name
        if dest.exists() and hashlib.sha256(dest.read_bytes()).digest() != hashlib.sha256(data).digest():
            dest = ASSETS / (hashlib.sha256(data).hexdigest()[:8] + "-" + name)
        dest.write_bytes(data)
        kept.append((name, loc, len(data)))

    slug = (page_url.rstrip("/").rsplit("/", 1)[-1] or "home") if page_url else mht.stem
    md = OUT / f"{slug}.md"
    body = [f"# {text_of(subject)}", "",
            f"> **Provenance.** Browser capture of `{page_url}`, saved {saved}.",
            f"> Original: `docs/legacy-migration/captures/{mht.name}`. This file is a",
            "> reading copy extracted by `scripts/legacy-extract.py`; the capture is",
            "> the record.", "", "---", ""]
    body += lines
    if kept:
        body += ["", "## Embedded assets preserved", ""]
        body += [f"- `{n}` ({b//1024} KB) — from `{loc}`" for n, loc, b in kept]
    if links:
        body += ["", "## Internal links on this page (legacy URL evidence)", ""]
        body += [f"- `{l}`" for l in links]
    md.write_text("\n".join(body) + "\n")
    print(f"  {mht.name} -> content/{md.name}  ({len(lines)} blocks, {len(kept)} assets, {len(links)} links)")
    return {"slug": slug, "url": page_url, "links": links}

results = [r for f in sorted(CAP.glob("*.mht*")) if (r := extract(f))]
if not results:
    print("No captures found in docs/legacy-migration/captures/ — drop .mhtml files there.")
else:
    all_links = sorted({l for r in results for l in r["links"]})
    (OUT / "_url-inventory.md").write_text(
        "# Legacy URL inventory (from captured pages' own navigation)\n\n" +
        f"Compiled from {len(results)} capture(s) by scripts/legacy-extract.py.\n\n" +
        "\n".join(f"- `{l}`" for l in all_links) + "\n")
    print(f"\n{len(results)} capture(s); URL inventory: {len(all_links)} distinct legacy URLs")
