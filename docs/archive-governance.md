# The SHRS Archive — Collections Governance

The rules under which the institutional archive accepts, describes, and
publishes material. Modelled on how university archives work, scaled to a
school that intends to keep its record for a century. These rules bind every
future contributor, including the founder.

## 1. What the archive collects

For every major event, at the time of the event:

| Class | Examples | Notes |
|---|---|---|
| Photographs | ceremony, guests, campus construction | originals at full resolution, EXIF retained **in the vault** (stripped only on the public site) |
| Video & audio | speeches, recitations, interviews | raw files, not only edited cuts |
| Print ephemera | event programmes, invitation cards, brochures, prospectuses | scanned at 300dpi+, physical originals kept |
| Press | newspaper clippings, online-article PDFs | **clippings/scans held in the vault under fair-dealing for preservation; published on the site only as citation + link unless the publisher grants permission** |
| Documents | speeches as delivered, letters, certificates, registrations | the CAC certificates belong here |
| Digital | website captures, social posts, press releases | the legacy-site captures are accession #1 |

## 2. The accession register

Every item gets a row in `archive/register.json` at intake, with:

- **Accession number** — `SHRS-A-YYYY-NNN`, permanent, never reused
- **Description** — what it is, in one sentence a stranger can use
- **Date of record** — when the thing it documents happened (not the scan date)
- **Provenance** — who supplied it, when, and how they know
- **Rights** — `school-owned` / `publisher-permission-needed` / `permission-held` / `fair-preservation-only`
- **Basis** — the same confidence discipline as `data/institutional-record.json`
- **File hash** — SHA-256, so tampering or corruption is detectable decades on

Intake is `python3 scripts/archive-intake.py <file> --desc … --date … --provenance … --rights …`
— it computes the hash, assigns the number, and writes the register row. An
item not in the register is not in the archive, wherever the file sits.

## 3. Publication rules

1. The vault keeps everything; the site publishes what the rights column
   allows. Never publish a scanned press clipping without the publisher's
   permission — cite and link instead.
2. Photographs of children are published only within the school's existing
   media-consent practice; the vault copy is retained regardless.
3. Captions come from the register's provenance field, never from inference.
4. Single-source claims are published as reported, not as established.

## 4. Corrections

A correction never deletes: the register row gains a `corrected` field with
the date, the old text, the new text, and the evidence. A corrected archive
outranks a spotless one, because it proves the discipline is real.

## 5. Custody

- The register and vault live in this repository (private material in a
  private location if needed — the register can reference files it does not
  contain).
- Two keepers at any time (currently: the Head of Schools and the Registrar's
  office). Accessions require one keeper; corrections require both.
- The register is reviewed each term: anything the term produced that is not
  yet accessioned is the review's action list.
