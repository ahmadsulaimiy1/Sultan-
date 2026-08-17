# The SHRS Oral History Programme

Some of the school's founding facts exist in no document and on no website —
they exist in people. This programme captures them before memory fades, to the
same evidence standard as the rest of the archive, and it is designed so the
Registrar's office can run it without outside help.

## Why now

The timeline has holes no search can fill: the land acquisition, the
construction years, the first admission day, the first cohort, the exact date
of the November 2024 unveiling. The people who know are available now. In
twenty years some will not be.

## Method

- **Recording**: audio at minimum (a phone in a quiet room is enough), video
  where the subject consents. Say the date, place, and both names onto the
  recording at the start.
- **Consent**: written, on school letterhead, before recording: what is being
  recorded, that it enters the school archive permanently, and what may be
  published versus held. One page. The signed form is accessioned with the
  recording.
- **Accession**: the raw recording, the consent form, and the transcript each
  get an accession number (`scripts/archive-intake.py`, basis `oral-history`).
- **Corroboration**: an oral account is testimony, not proof. Where an
  interview yields a date or a name, chase the document it implies (a deed, a
  receipt, a register, a photograph) and accession that too. The transcript
  notes which claims found documents and which rest on memory alone.

## Whom to interview, and what only they know

### The Founder — Dr. Zakariya Olanrewaju Anofi
- The land: when acquired, from whom, what stood there before
- Construction: years, builders, what was built first, what it cost in effort
- The first admission day: date, how many children, the very first pupil's name
- His father: the stories behind the name the school carries
- The Fashola-era origin of the idea — what exactly happened, and when
- The Makinde years: the work as chief accountant, and how the mentorship began
- **The unveiling, November 2024: the exact date, the guest list, the programme** — and where the printed programme, invitation cards and speeches are now
- The ₦10m gift: how it was received, how it has been applied

### The Registrar
- The first register: earliest enrolment records, and where they physically are
- Examination history: first BECE/WAEC cohorts, first results
- The documents the office holds that belong in the archive (certificates,
  approvals, correspondence)
- **The Ministry of Education approval: number, date, and the certificate**

### Early staff (the first three years)
- Names of the founding staff, in order of arrival
- What the school physically was in 2016–17 — rooms, numbers, timetable
- The first graduation: date, cohort, what was said

### Founding parents
- Why they chose an unproven school; what it was like in year one
- Photographs and keepsakes they may hold (event programmes, invitations,
  early report cards) — ask to scan, accession with their permission

### Community leaders (Imowonla / Gberigbe)
- The land and the community's account of the school's arrival
- The COVID-19 relief, the road maintenance, the electrification — dates,
  scope, who benefited; this is the corroboration the community-impact
  claims currently lack

### The Director, Qur'an College — Ahmed Sulaimon
- The competition's founding: whose idea, the first edition's date and winners
  (the press only covers the second)
- The ijāzah examiners: the named scholars, and the scholarly-visit
  photographs — who visited, when, on what occasion

## Standing requests to the school (documents before interviews)

1. Camera-original photographs of the unveiling (the vault currently holds the
   web-published versions; originals carry the EXIF dates that would settle
   the ceremony's exact date on their own)
2. The CAC certificates for both registered entities
3. The Ministry approval certificate, if held
4. The printed programme and invitation card of any past event, starting with
   the unveiling
5. The four Punch articles saved as PDF from a browser (File → Print → Save
   as PDF), for the vault under fair-preservation

## Output

Each completed interview produces: the recording (accessioned), the transcript
(accessioned), a one-page summary of new facts with their corroboration
status, and updates to `data/institutional-record.json` — where a fact moves
from `school-confirmation-needed` to documented, the register row is its
citation.
