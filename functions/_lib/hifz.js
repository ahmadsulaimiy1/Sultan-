// Shared constants for Qur'an College Hifz tracking, used by
// admin/hifz-progress.js, student/me.js, and me.js (guardian) so the
// institution match and the 5-stage labels are defined once rather than
// copy-pasted across endpoints.

export const QURAN_COLLEGE_INSTITUTION = "Qur'an College";

// Case/whitespace-tolerant match — a fat-fingered "quran college" or a
// trailing space in admin data shouldn't silently make a real Qur'an
// College student invisible to this feature.
export function isQuranCollegeInstitution(institution) {
  return String(institution || '').trim().toLowerCase() === QURAN_COLLEGE_INSTITUTION.toLowerCase();
}

// Mirrors the school's own published 5-stage Hifz Journey (public
// Qur'an College page) — kept here as the single source of truth so the
// database only stores a stage_number and neither dashboard hardcodes
// this copy independently.
export const HIFZ_STAGES = [
  { number: 1, label: 'Memorisation & Muraja’ah', description: 'New memorisation paired with scheduled revision; a weekly check verifies retention.' },
  { number: 2, label: 'Progression Through the 30 Juz’', description: 'Pace-based, not time-based.' },
  { number: 3, label: 'Completion Standard', description: 'All 30 Juz’ memorised, retention verified, Tajweed confirmed.' },
  { number: 4, label: 'Ijazah Examination', description: 'The Principal puts the student forward for examination by named scholars.' },
  { number: 5, label: 'Ijazah Granted', description: 'Certified, signed, and permanently recorded in the register.' },
];

export function hifzStageLabel(stageNumber) {
  const stage = HIFZ_STAGES.find((s) => s.number === stageNumber);
  return stage ? stage.label : null;
}

export function hifzStageDescription(stageNumber) {
  const stage = HIFZ_STAGES.find((s) => s.number === stageNumber);
  return stage ? stage.description : null;
}

export const TOTAL_JUZ = 30;

// Fills in any Juz' the database has no row for yet as 'not_started', so
// consumers always get a full 30-entry array regardless of how many rows
// exist.
export function fillJuzGrid(rows) {
  const byJuz = new Map(rows.map((r) => [r.juz_number, r]));
  const grid = [];
  for (let n = 1; n <= TOTAL_JUZ; n++) {
    const row = byJuz.get(n);
    grid.push({
      juzNumber: n,
      status: row ? row.status : 'not_started',
      murajaahNote: row ? row.murajaah_note : null,
      tajweedNote: row ? row.tajweed_note : null,
      muhaffizName: row ? row.muhaffiz_name : null,
      assessedAt: row ? row.assessed_at : null,
    });
  }
  return grid;
}
