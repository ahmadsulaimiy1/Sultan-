// Tajweed Compliance Framework — same Institutional Capability
// Framework pattern, scoped to Qur'anic recitation rules. Categories
// (Makharij, Sifaat, Ahkam, Applied Recitation) are the standard, real
// divisions of Tajweed study, not invented for this system. Zero
// transactional assessments exist yet (Current Records: 0).
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';

const SUB_CAPABILITIES = [
  { key: 'makharij', label: 'Makharij', description: 'Real per-student assessment of correct letter-articulation points.' },
  { key: 'sifaat', label: 'Sifaat', description: 'Assessment of each letter’s inherent pronunciation characteristics.' },
  { key: 'ahkam', label: 'Ahkam', description: 'Rules governing letter interaction — noon/meem rulings, madd, qalqalah.' },
  { key: 'application', label: 'Applied Recitation', description: 'Fluent, rule-compliant recitation of continuous passages at real pace.' },
  { key: 'assessment_cycles', label: 'Assessment Cycles', description: 'Every assessment tagged to a real cycle, so progress is comparable over time.' },
  { key: 'remediation_plans', label: 'Remediation Plans', description: 'A real, recorded remediation plan wherever compliance is below Proficient.' },
];

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try { session = readStaffSessionFromRequest(request, env.SESSION_SECRET); }
  catch (err) { return { error: json({ error: 'Portal is not configured yet.' }, 500) }; }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  try {
    const grants = await effectiveGrants(sql, staffId);
    const { granted } = checkGrants(grants, 'tajweed_compliance', 'V', null);
    if (!granted) return json({ error: 'Your role does not include Tajweed-compliance visibility.' }, 403);
    const viewable = grants.filter((g) => hasPermission(g.roleCode, 'tajweed_compliance', 'V').granted);
    const unscoped = viewable.some((g) => g.institutionId == null);

    const catsRes = await sql`SELECT code, label, description FROM tajweed_categories ORDER BY sort_order`;
    const framework = { status: 'Operational Framework Ready', subCapabilities: SUB_CAPABILITIES, categories: catsRes.rows.map((r) => ({ code: r.code, label: r.label, description: r.description })) };

    let rows;
    if (unscoped) {
      rows = (await sql`
        SELECT a.*, s.full_name AS student_name, cat.label AS category_label
        FROM tajweed_assessments a LEFT JOIN students s ON s.id = a.student_id LEFT JOIN tajweed_categories cat ON cat.id = a.category_id
        ORDER BY a.assessed_at DESC`).rows;
    } else {
      const institutionIds = [...new Set(viewable.map((g) => g.institutionId).filter((x) => x != null))];
      rows = institutionIds.length ? (await sql`
        SELECT a.*, s.full_name AS student_name, cat.label AS category_label
        FROM tajweed_assessments a LEFT JOIN students s ON s.id = a.student_id LEFT JOIN tajweed_categories cat ON cat.id = a.category_id
        WHERE a.institution_id = ANY(${institutionIds}) ORDER BY a.assessed_at DESC`).rows : [];
    }

    return json({
      ok: true, framework, currentRecords: rows.length,
      assessments: rows.map((r) => ({
        id: r.id, student: r.student_name, category: r.category_label, complianceLevel: r.compliance_level,
        cycle: r.assessment_cycle, remediationPlan: r.remediation_plan, notes: r.notes, assessedAt: r.assessed_at,
      })),
    });
  } catch (err) {
    console.error('staff tajweed-compliance GET error', err);
    return json({ error: 'Could not load the Tajweed Compliance Framework right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  if (body.action !== 'record-assessment') return json({ error: 'Unknown action. Expected: record-assessment.' }, 400);

  try {
    const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'tajweed_compliance', 'C', body.institutionId || null);
    if (!granted) return json({ error: 'Your role does not have authority to record a Tajweed assessment.' }, 403);
    if (!Number.isInteger(body.studentId) || !body.categoryCode || !['developing', 'competent', 'proficient', 'mastered'].includes(body.complianceLevel) || !body.assessmentCycle) {
      return json({ error: 'studentId (number), categoryCode, complianceLevel, and assessmentCycle are required.' }, 400);
    }
    const catRes = await sql`SELECT id FROM tajweed_categories WHERE code = ${body.categoryCode}`;
    if (!catRes.rows.length) return json({ error: 'Unknown category code.' }, 400);

    const inserted = await sql`
      INSERT INTO tajweed_assessments (student_id, institution_id, category_id, compliance_level, assessment_cycle, remediation_plan, notes, assessor_staff_id)
      VALUES (${body.studentId}, ${body.institutionId || null}, ${catRes.rows[0].id}, ${body.complianceLevel}, ${body.assessmentCycle}, ${body.remediationPlan || null}, ${body.notes || null}, ${staffId})
      RETURNING id`;
    return json({ ok: true, assessmentId: inserted.rows[0].id });
  } catch (err) {
    console.error('staff tajweed-compliance POST error', err);
    return json({ error: 'Could not save that assessment right now — please try again shortly.' }, 500);
  }
}
