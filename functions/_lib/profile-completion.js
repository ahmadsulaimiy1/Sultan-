// Computes Profile Completion % at READ time, never stored — a stored
// percentage drifts the moment any counted field changes without the
// write path remembering to recompute it. Every "me"/"profile" read
// calls this against the current row, so it can never go stale.
//
// 22 base fields across four sections (Personal, Contact, Residential,
// Professional, Family) collected in Phase 1A, plus two section-level
// bonuses (Emergency Contacts, Educational Interests) that only count
// once genuinely complete — not partially filled. 24 total "completion
// units"; percentage is filled-units / 24. Registration-mandatory
// fields (full name, email, phone, password) are NOT counted here —
// this measures the *optional* institutional profile depth, which is
// the thing that is actually incomplete for a brand-new registrant.
const PERSONAL_FIELDS = ['title', 'preferred_name', 'gender', 'date_of_birth', 'nationality', 'state_of_origin', 'local_government_area', 'country_of_residence'];
const CONTACT_FIELDS = ['whatsapp_number', 'secondary_phone', 'secondary_email'];
const RESIDENTIAL_FIELDS = ['residential_address', 'residential_city', 'residential_state', 'postal_code'];
const PROFESSIONAL_FIELDS = ['occupation', 'employer', 'position_title', 'business_name', 'industry'];
const FAMILY_FIELDS = ['marital_status', 'number_of_children'];

const ALL_BASE_FIELDS = [...PERSONAL_FIELDS, ...CONTACT_FIELDS, ...RESIDENTIAL_FIELDS, ...PROFESSIONAL_FIELDS, ...FAMILY_FIELDS];
const TOTAL_UNITS = ALL_BASE_FIELDS.length + 2; // +2 for the emergency-contacts and educational-interests bonuses

function isFilled(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function sectionComplete(guardian, fields) {
  return fields.every((f) => isFilled(guardian[f]));
}

// `guardian` is a raw DB row (snake_case columns). `emergencyContactCount`
// and `educationalInterestCount` come from their own tables, not the
// guardians row.
export function computeProfileCompletion(guardian, { emergencyContactCount, educationalInterestCount }) {
  const filledBaseCount = ALL_BASE_FIELDS.filter((f) => isFilled(guardian[f])).length;
  const emergencyContactsComplete = emergencyContactCount >= 2;
  const educationalInterestsComplete = educationalInterestCount >= 1;
  const filledUnits = filledBaseCount + (emergencyContactsComplete ? 1 : 0) + (educationalInterestsComplete ? 1 : 0);

  return {
    profileCompletionPct: Math.round((filledUnits / TOTAL_UNITS) * 100),
    sections: {
      personal: sectionComplete(guardian, PERSONAL_FIELDS),
      contact: sectionComplete(guardian, CONTACT_FIELDS),
      residential: sectionComplete(guardian, RESIDENTIAL_FIELDS),
      professional: sectionComplete(guardian, PROFESSIONAL_FIELDS),
      family: sectionComplete(guardian, FAMILY_FIELDS),
      emergencyContacts: emergencyContactsComplete,
      educationalInterests: educationalInterestsComplete,
    },
  };
}

// Recommended-next-step priority, most institutionally urgent first.
// Emergency contacts and identity verification matter more to a school
// than "did you list your employer," so they're checked first.
export function recommendNextStep(sections, emailVerified) {
  if (!emailVerified) return 'Verify your email address';
  if (!sections.emergencyContacts) return 'Add your emergency contacts';
  if (!sections.educationalInterests) return 'Select your educational interests';
  if (!sections.personal) return 'Complete your personal profile';
  if (!sections.residential) return 'Complete your residential profile';
  if (!sections.contact) return 'Add a secondary phone or email';
  if (!sections.professional) return 'Complete your professional profile';
  if (!sections.family) return 'Complete your family profile';
  return 'Your institutional profile is complete';
}
