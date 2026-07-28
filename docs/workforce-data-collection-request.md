# SHRS Workforce Data Collection Request

**This is a request for real data, not a data source.** Everything
below is the intake structure the school should fill in — it contains
zero fabricated names, qualifications, or assignments. Per the standing
rule this engagement now operates under: *no invention, no placeholders
disguised as reality, no simulated institutional facts.* Once this is
returned filled in, it becomes the input to the Human Capital Register
(§4) and to real `staff` data entry (`docs/institutional-data-architecture.md`).

**Status note:** Royal College's JSS/SSS roster (collected separately
from this intake, before this note was added) now has **two
conflicting versions on file** — see `master-academic-structure-register.md`
§4a-bis for the full comparison. That conflict needs the school's
direct answer before any Royal College names are published publicly;
it is not something this document's own intake structure can resolve.

## 1. Nursery & Primary School Faculty

For every real teacher, please supply:

| Full Name | Title | Qualification | Class Assignment | Subject Assignment |
|---|---|---|---|---|
| *(awaiting real data)* | | | | |

## 2. School of Arabic & Islamic Studies Faculty — **supplied, integrated**

**Distinct from Qur'an College** — the two lists arrived merged once
already (`master-academic-structure-register.md` v1.1's §4d error) and
have now been correctly split. Full detail, qualifications, and
teaching areas: `docs/master-academic-structure-register.md` §4d
(Qur'an College — Ustadh Muhammad Fodio, Ustadh Muhammad Awwal Ishola)
and §4e (School of Arabic & Islamic Studies — Ustadh Abdul-Hameed
Abdurrahman, Ustadh Sherifudeen Olaifa, Ustadh Mas'oud Abdul-Fattah,
Engr. Ustadhah Fatimah A.). Ustadh Sherifudeen Olaifa's qualification
remains unsupplied, recorded as such, not filled in.

## 3. Administrative Workforce Register

| Position | Full Name |
|---|---|
| Administrator / CEO | *(GV-01 already names this individual — confirm whether to carry that name into this register, or whether a real `staff` account should be created separately)* |
| VP Administration | *(awaiting real data — role currently `proposed`, not adopted, per `docs/teacher-operating-model.md`)* |
| Registrar | *(AC-02/PA-05 already name this individual — same confirmation question as CEO above)* |
| Finance Officer | *(awaiting real data — role currently `proposed`)* |
| ICT Officer | *(awaiting real data — role currently `proposed`)* |
| HR Officer | *(awaiting real data — no HR role/office exists in the system at all yet)* |
| Principal, Royal College | *(awaiting real data)* |
| Principal, School of Arabic & Islamic Studies | *(awaiting real data)* |
| Head Teacher, Nursery & Primary | *(awaiting real data)* |

## 4. What happens once this is returned filled in

1. Names are integrated into the Master Academic Structure Register
   exactly as the JSS/SSS and Qur'an College faculty were — cited,
   dated, marked real.
2. A **Human Capital Register** is created as the single authoritative
   source across every teacher, instructor, administrator, and
   executive — the eventual master source for Staff IDs, institutional
   emails, permissions, dashboards, timetables, and payroll references,
   as requested. It is not created now, empty or with any name
   invented, because a register with placeholder rows would be exactly
   the "placeholder disguised as reality" this phase forbids.
3. Real `staff` rows can then be entered via the already-built
   `admin/staff.js` sequence, in whichever real environment exists at
   that point (see the Account Creation Playbook — this still requires
   a real, reachable database, which does not exist yet).

## 5. What does not wait for this data

The Founder Dashboard's authentication migration (bearer token → real
staff-session + Permission Engine) does not depend on any of the above
— it is already built and verified this session against a test EXE
account. See the Identity Migration Register for its current status.
