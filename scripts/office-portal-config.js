// Institutional Portal Ecosystem — the single source of truth for which
// office portals exist and how they're grouped/labelled in navigation.
// Mirrors the `offices` rows seeded in sql/schema.sql /
// functions/api/portal/setup.js (slug values must match exactly — the
// runtime data comes from /api/portal/staff/office/{slug}, this file
// only drives which static shell pages get generated and how the
// directory index groups them). Adding a 27th office later is one row
// here plus one INSERT row in the schema files, not a new template.
const LAYERS = [
  { key: 'governance', label: 'Governance' },
  { key: 'academic', label: 'Academic' },
  { key: 'school_leadership', label: 'School Leadership' },
  { key: 'operational', label: 'Operational' },
  { key: 'institutional_services', label: 'Institutional Services' },
];

const OFFICES = [
  { slug: 'board-of-trustees', name: 'Board of Governors', layer: 'governance' },
  { slug: 'executive', name: 'Head of Schools / Administrator', layer: 'governance' },
  { slug: 'management-council', name: 'Management Council', layer: 'governance' },
  { slug: 'strategic-planning', name: 'Strategic Planning', layer: 'governance' },
  { slug: 'quality-assurance', name: 'Quality Assurance', layer: 'governance' },
  { slug: 'legal-compliance', name: 'Legal & Compliance', layer: 'governance' },
  { slug: 'public-affairs', name: 'Public Affairs', layer: 'governance' },
  { slug: 'committee-finance', name: 'Finance Committee', layer: 'governance' },
  { slug: 'committee-governance', name: 'Governance Committee', layer: 'governance' },
  { slug: 'committee-audit', name: 'Audit Committee', layer: 'governance' },
  { slug: 'committee-academic-excellence', name: 'Academic Excellence Committee', layer: 'governance' },
  { slug: 'committee-development', name: 'Development Committee', layer: 'governance' },

  { slug: 'academic-affairs', name: 'Academic Affairs', layer: 'academic' },
  { slug: 'registrar', name: "Registrar's Office", layer: 'academic', deepLink: { href: '/portal/staff/registrar/', label: 'Open Registrar Operations' } },
  { slug: 'examinations', name: 'Examinations', layer: 'academic' },
  { slug: 'admissions', name: 'Admissions', layer: 'academic', deepLink: { href: '/portal/staff/admissions/', label: 'Open Admissions Review Centre' } },

  { slug: 'head-teacher', name: 'Head Teacher — Sultan Hanafi Basic School', layer: 'school_leadership' },
  { slug: 'principal-royal-college', name: 'Principal — Sultan Hanafi Secular College', layer: 'school_leadership' },
  { slug: 'raees', name: 'Office of the Principal — Sultan Hanafi Islamiyyah College', layer: 'school_leadership' },
  { slug: 'mudeer', name: "Office of the Principal — Sultan Hanafi Qur'an College", layer: 'school_leadership' },

  { slug: 'finance', name: 'Finance Office', layer: 'operational', deepLink: { href: '/portal/staff/finance/', label: 'Open Finance Operations' } },
  { slug: 'hr', name: 'Human Resources', layer: 'operational' },
  { slug: 'student-affairs', name: 'Student Affairs', layer: 'operational' },
  { slug: 'communications', name: 'Communications', layer: 'operational' },
  { slug: 'digital-services', name: 'Digital Services (ICT)', layer: 'operational', deepLink: { href: '/portal/staff/identity/', label: 'Open Digital Identity Tools' } },
  { slug: 'digital-learning', name: 'Digital Learning & Innovation', layer: 'operational' },

  { slug: 'library', name: 'Library', layer: 'institutional_services' },
  { slug: 'alumni', name: 'Alumni', layer: 'institutional_services' },
  { slug: 'foundation', name: 'Sultan Hanafi Foundation', layer: 'institutional_services' },
  { slug: 'certificates', name: 'Certificate & Transcript Office', layer: 'institutional_services' },
  { slug: 'digital-identity', name: 'Digital Identity Office', layer: 'institutional_services' },
  { slug: 'knowledge-base', name: 'Institutional Knowledge Base', layer: 'institutional_services' },
];

module.exports = { OFFICES, LAYERS };
