// Arabic Fluency Framework — same Institutional Capability Framework
// pattern. Five-tier proficiency bands (Beginner → Fluent) are a
// standard language-assessment scale, not policy-derived and not
// fabricated student data. Zero transactional assessments exist yet
// (Current Records: 0).
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';

const SUB_CAPABILITIES = [
  { key: 'reading', label: 'Reading Proficiency', description: 'Real per-student assessments against the five-tier band scale.' },
  { key: 'writing', label: 'Writing Proficiency', description: 'Independent assessment cycle, tracked separately from reading.' },
  { key: 'listening', label: 'Listening Proficiency', description: 'Comprehension assessed on its own cycle.' },
  { key: 'speaking', label: 'Speaking Proficiency', description: 'Oral production assessed on its own cycle.' },
  { key: 'assessment_cycles', label: 'Assessment Cycles', description: 'Every assessment tagged to a real term/cycle label, so progress is comparable over time.' },
  { key: 'placement_bands', label: 'Placement Bands', description: 'A real five-tier scale (Beginner/Elementary/Intermediate/Advanced/Fluent) each student is placed against.' },
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
    const { granted } = checkGrants(grants, 'arabic_fluency', 'V', null);
    if (!granted) return json({ error: 'Your role does not include Arabic-fluency visibility.' }, 403);
    const viewable = grants.filter((g) => hasPermission(g.roleCode, 'arabic_fluency', 'V').granted);
    const unscoped = viewable.some((g) => g.institutionId == null);

    const bandsRes = await sql`SELECT code, label, description FROM arabic_fluency_bands ORDER BY sort_order`;
    const framework = { status: 'Operational Framework Ready', subCapabilities: SUB_CAPABILITIES, bands: bandsRes.rows.map((r) => ({ code: r.code, label: r.label, description: r.description })) };

    let rows;
    if (unscoped) {
      rows = (await sql`
        SELECT a.*, s.full_name AS student_name, b.label AS band_label
        FROM arabic_fluency_assessments a LEFT JOIN students s ON s.id = a.student_id LEFT JOIN arabic_fluency_bands b ON b.id = a.band_id
        ORDER BY a.assessed_at DESC`).rows;
    } else {
      const institutionIds = [...new Set(viewable.map((g) => g.institutionId).filter((x) => x != null))];
      rows = institutionIds.length ? (await sql`
        SELECT a.*, s.full_name AS student_name, b.label AS band_label
        FROM arabic_fluency_assessments a LEFT JOIN students s ON s.id = a.student_id LEFT JOIN arabic_fluency_bands b ON b.id = a.band_id
        WHERE a.institution_id = ANY(${institutionIds}) ORDER BY a.assessed_at DESC`).rows : [];
    }

    return json({
      ok: true, framework, currentRecords: rows.length,
      assessments: rows.map((r) => ({ id: r.id, student: r.student_name, skill: r.skill, band: r.band_label, cycle: r.assessment_cycle, notes: r.notes, assessedAt: r.assessed_at })),
    });
  } catch (err) {
    console.error('staff arabic-fluency GET error', err);
    return json({ error: 'Could not load the Arabic Fluency Framework right now — please try again shortly.' }, 500);
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
    const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'arabic_fluency', 'C', body.institutionId || null);
    if (!granted) return json({ error: 'Your role does not have authority to record an Arabic fluency assessment.' }, 403);
    if (!Number.isInteger(body.studentId) || !['reading', 'writing', 'listening', 'speaking'].includes(body.skill) || !body.bandCode || !body.assessmentCycle) {
      return json({ error: 'studentId (number), skill, bandCode, and assessmentCycle are required.' }, 400);
    }
    const bandRes = await sql`SELECT id FROM arabic_fluency_bands WHERE code = ${body.bandCode}`;
    if (!bandRes.rows.length) return json({ error: 'Unknown band code.' }, 400);

    const inserted = await sql`
      INSERT INTO arabic_fluency_assessments (student_id, institution_id, skill, band_id, assessment_cycle, notes, assessor_staff_id)
      VALUES (${body.studentId}, ${body.institutionId || null}, ${body.skill}, ${bandRes.rows[0].id}, ${body.assessmentCycle}, ${body.notes || null}, ${staffId})
      RETURNING id`;
    return json({ ok: true, assessmentId: inserted.rows[0].id });
  } catch (err) {
    console.error('staff arabic-fluency POST error', err);
    return json({ error: 'Could not save that assessment right now — please try again shortly.' }, 500);
  }
}
