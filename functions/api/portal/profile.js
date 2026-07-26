// Institutional Identity Profile (Phase 1A) — GET returns the signed-in
// guardian's full profile plus a computed completion breakdown; POST
// updates whichever section(s) the caller sends. One endpoint for all
// five sections (Personal, Contact, Residential, Professional, Family)
// rather than five, since they're all optional columns on the same
// `guardians` row and a partial update is the common case (a guardian
// filling in one section at a time, exactly as the directive's staged
// UI implies).
import { getSql } from '../../_lib/db.js';
import { readSessionFromRequest } from '../../_lib/session.js';
import { json, readJsonBody } from '../../_lib/http.js';
import { computeProfileCompletion, recommendNextStep } from '../../_lib/profile-completion.js';

const TITLES = ['Mr.', 'Mrs.', 'Miss', 'Dr.', 'Engr.', 'Prof.', 'Alhaji', 'Alhaja', 'Shaykh', 'Ustadh'];

// Column name -> body field name. Kept as one explicit map so a typo'd
// or unexpected body key can never silently reach an UPDATE statement.
const UPDATABLE_FIELDS = {
  title: 'title',
  preferredName: 'preferred_name',
  gender: 'gender',
  dateOfBirth: 'date_of_birth',
  nationality: 'nationality',
  stateOfOrigin: 'state_of_origin',
  localGovernmentArea: 'local_government_area',
  countryOfResidence: 'country_of_residence',
  secondaryPhone: 'secondary_phone',
  whatsappNumber: 'whatsapp_number',
  secondaryEmail: 'secondary_email',
  residentialAddress: 'residential_address',
  residentialCity: 'residential_city',
  residentialState: 'residential_state',
  postalCode: 'postal_code',
  occupation: 'occupation',
  employer: 'employer',
  positionTitle: 'position_title',
  businessName: 'business_name',
  industry: 'industry',
  maritalStatus: 'marital_status',
  numberOfChildren: 'number_of_children',
};

async function requireSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { guardianId: session.guardianId };
}

async function loadProfile(sql, guardianId) {
  const guardianRes = await sql`SELECT * FROM guardians WHERE id = ${guardianId}`;
  const guardian = guardianRes.rows[0];
  if (!guardian) return null;

  const [contactsRes, interestsRes, existingChildrenRes, prospectiveChildrenRes] = await Promise.all([
    sql`SELECT id, contact_order, full_name, relationship, phone, email FROM guardian_emergency_contacts WHERE guardian_id = ${guardianId} ORDER BY contact_order`,
    sql`SELECT institution_key FROM guardian_educational_interests WHERE guardian_id = ${guardianId}`,
    sql`SELECT COUNT(*)::int AS n FROM guardian_student WHERE guardian_id = ${guardianId}`,
    sql`
      SELECT COUNT(*)::int AS n FROM admissions_applications
      WHERE guardian_id = ${guardianId} AND status IN ('submitted', 'under_review', 'waitlisted', 'offered')`,
  ]);

  const { profileCompletionPct, sections } = computeProfileCompletion(guardian, {
    emergencyContactCount: contactsRes.rows.length,
    educationalInterestCount: interestsRes.rows.length,
  });

  return {
    identityType: guardian.identity_type,
    title: guardian.title,
    fullName: guardian.full_name,
    preferredName: guardian.preferred_name,
    gender: guardian.gender,
    dateOfBirth: guardian.date_of_birth,
    nationality: guardian.nationality,
    stateOfOrigin: guardian.state_of_origin,
    localGovernmentArea: guardian.local_government_area,
    countryOfResidence: guardian.country_of_residence,
    email: guardian.email,
    secondaryEmail: guardian.secondary_email,
    phone: guardian.phone,
    secondaryPhone: guardian.secondary_phone,
    whatsappNumber: guardian.whatsapp_number,
    residentialAddress: guardian.residential_address,
    residentialCity: guardian.residential_city,
    residentialState: guardian.residential_state,
    postalCode: guardian.postal_code,
    occupation: guardian.occupation,
    employer: guardian.employer,
    positionTitle: guardian.position_title,
    businessName: guardian.business_name,
    industry: guardian.industry,
    maritalStatus: guardian.marital_status,
    numberOfChildren: guardian.number_of_children,
    // Computed from real linked records, never a manually-entered
    // duplicate — a guardian_student row already exists per enrolled
    // child, and admissions_applications tracks in-progress ones, so
    // storing these as separate editable fields would just invite drift.
    existingChildrenCount: existingChildrenRes.rows[0] ? existingChildrenRes.rows[0].n : 0,
    prospectiveChildrenCount: prospectiveChildrenRes.rows[0] ? prospectiveChildrenRes.rows[0].n : 0,
    emailVerified: !!guardian.email_verified_at,
    mobileVerified: !!guardian.mobile_verified_at,
    emergencyContacts: contactsRes.rows.map((c) => ({ id: c.id, order: c.contact_order, fullName: c.full_name, relationship: c.relationship, phone: c.phone, email: c.email })),
    educationalInterests: interestsRes.rows.map((r) => r.institution_key),
    profileCompletionPct,
    sections,
    recommendedNextStep: recommendNextStep(sections, !!guardian.email_verified_at),
  };
}

export async function onRequestGet({ request, env }) {
  const { guardianId, error } = await requireSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const profile = await loadProfile(sql, guardianId);
    if (!profile) return json({ error: 'Not signed in.' }, 401);
    return json(profile);
  } catch (err) {
    console.error('portal profile get error', err);
    return json({ error: 'Could not load your profile right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { guardianId, error } = await requireSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  if (body.title && !TITLES.includes(body.title)) {
    return json({ error: 'Please choose a title from the provided list.' }, 400);
  }
  if (body.numberOfChildren != null && body.numberOfChildren !== '' && !Number.isInteger(Number(body.numberOfChildren))) {
    return json({ error: 'Number of children must be a whole number.' }, 400);
  }

  const setClauses = [];
  const values = [guardianId];
  for (const [bodyKey, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (!(bodyKey in body)) continue;
    values.push(body[bodyKey] === '' ? null : body[bodyKey]);
    setClauses.push(`${column} = $${values.length}`);
  }
  if (!setClauses.length) {
    return json({ error: 'No recognised profile fields were provided.' }, 400);
  }

  try {
    await sql.query(`UPDATE guardians SET ${setClauses.join(', ')} WHERE id = $1`, values);
    const profile = await loadProfile(sql, guardianId);
    return json({ ok: true, ...profile });
  } catch (err) {
    console.error('portal profile update error', err);
    return json({ error: 'Could not save your profile right now — please try again shortly.' }, 500);
  }
}
