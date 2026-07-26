// Fixed set of educational-interest keys a guardian/applicant can
// select against (Phase 1A of the Imperial Digital Identity &
// Onboarding Directive). One source of truth so the API validates
// against exactly what the frontend offers — no free-text drift.
//
// The last three are interest SIGNALS, not real published programmes —
// see docs/imperial-identity-onboarding-reality-check.md's Stage 8
// note. They stay in the same list because that is honestly what they
// are either way: something a prospective family said they want, not
// something SHRS has committed to run.
export const EDUCATIONAL_INTEREST_OPTIONS = [
  { key: 'nursery_primary', label: 'Nursery & Primary School' },
  { key: 'royal_college', label: 'Royal College' },
  { key: 'islamic_arabic_studies', label: 'School of Islamic & Arabic Studies' },
  { key: 'quran_college', label: "Qur'an College" },
  { key: 'online_programmes', label: 'Online Programmes' },
  { key: 'weekend_programmes', label: 'Weekend Programmes' },
  { key: 'summer_programmes', label: 'Summer Programmes' },
];

const VALID_KEYS = new Set(EDUCATIONAL_INTEREST_OPTIONS.map((o) => o.key));

export function isValidEducationalInterestKey(key) {
  return VALID_KEYS.has(key);
}
