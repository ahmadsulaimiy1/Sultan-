#!/usr/bin/env python3
"""
=============================================================================
ARCHIVE INTAKE — accession one item into the SHRS institutional archive
=============================================================================

    python3 scripts/archive-intake.py <file> \
        --desc "Event programme, unveiling of Royal College" \
        --date 2024-11 \
        --provenance "Supplied by the Registrar's office, Aug 2026" \
        --rights school-owned \
        [--basis original] [--event unveiling-2024]

Copies the file into archive/vault/<accession>/, computes its SHA-256, and
appends the register row. Never overwrites, never reuses a number, refuses a
file whose hash is already registered (the item is already in).

Rules of the register live in docs/archive-governance.md. An item not in the
register is not in the archive, wherever the file sits.
=============================================================================
"""
import argparse, hashlib, json, shutil, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTER = ROOT / "archive/register.json"
VAULT = ROOT / "archive/vault"

RIGHTS = ["school-owned", "publisher-permission-needed", "permission-held",
          "fair-preservation-only"]
BASIS = ["original", "capture", "scan", "press-snippet", "registry-snippet",
         "self-published", "oral-history"]

ap = argparse.ArgumentParser()
ap.add_argument("file")
ap.add_argument("--desc", required=True, help="one sentence a stranger can use")
ap.add_argument("--date", required=True, help="date OF THE RECORD (YYYY[-MM[-DD]]), not the scan date")
ap.add_argument("--provenance", required=True, help="who supplied it, when, how they know")
ap.add_argument("--rights", required=True, choices=RIGHTS)
ap.add_argument("--basis", default="original", choices=BASIS)
ap.add_argument("--event", default="", help="slug tying items of one event together")
a = ap.parse_args()

src = Path(a.file)
if not src.is_file():
    sys.exit(f"not a file: {src}")

digest = hashlib.sha256(src.read_bytes()).hexdigest()

REGISTER.parent.mkdir(parents=True, exist_ok=True)
reg = json.loads(REGISTER.read_text()) if REGISTER.exists() else {"items": []}

for item in reg["items"]:
    if item["sha256"] == digest:
        sys.exit(f"already accessioned as {item['accession']}: {item['desc']}")

year = date.today().year
n = sum(1 for i in reg["items"] if i["accession"].startswith(f"SHRS-A-{year}-")) + 1
acc = f"SHRS-A-{year}-{n:03d}"

dest_dir = VAULT / acc
dest_dir.mkdir(parents=True, exist_ok=False)
dest = dest_dir / src.name
shutil.copy2(src, dest)

reg["items"].append({
    "accession": acc,
    "file": str(dest.relative_to(ROOT)),
    "sha256": digest,
    "bytes": src.stat().st_size,
    "desc": a.desc,
    "date_of_record": a.date,
    "accessioned": date.today().isoformat(),
    "provenance": a.provenance,
    "rights": a.rights,
    "basis": a.basis,
    "event": a.event,
})
REGISTER.write_text(json.dumps(reg, indent=1, ensure_ascii=False) + "\n")
print(f"{acc}  {src.name}  ({src.stat().st_size//1024} KB)")
print(f"sha256 {digest[:16]}…  rights={a.rights}  basis={a.basis}")
print(f"register now holds {len(reg['items'])} item(s)")
