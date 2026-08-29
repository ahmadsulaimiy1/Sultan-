// The single list of valid office_correspondence.document_type values —
// must stay in lockstep with the CHECK constraint in sql/schema.sql.
// Shared by draft.js (AI guidance, validation) and save.js (validation)
// so the two can never drift into accepting different sets.
export const DOCUMENT_TYPES = [
  'letter', 'memo', 'circular', 'notice', 'report', 'minutes',
  'appointment_letter', 'warning_letter', 'promotion_letter',
  'invitation', 'press_release', 'proposal',
];
