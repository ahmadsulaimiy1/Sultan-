// Teacher Performance Framework — same Institutional Capability
// Framework pattern as Safeguarding/Behaviour. No dedicated Performance
// Management Policy exists yet (Staff Handbook §7 names this a known,
// real gap) — the five observation domains are real, internationally
// standard classroom-observation categories, not policy-derived and
// not fabricated performance data. Zero transactional records exist
// yet — reported honestly (currentRecords: 0).
//
// GET  — framework status + real (possibly empty) observations, PD
//        records, and reviews, scoped by institution grant.
// POST — { action: 'record-observation' | 'log-pd' | 'start-review' | 'update-observation' | 'update-review' }
import { getSql } from '../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../_lib/session.js';
import { json, readJsonBody } from '../../../_lib/http.js';
import { effectiveGrants, checkGrants } from '../../../_lib/permissions.js';
import { hasPermission } from '../../../_lib/permission-matrix.js';
import { generateWithRetryOnConflict } from '../../../_lib/generate-with-retry.js';

const SUB_CAPABILITIES = [
  { key: 'observations', label: 'Classroom Observations', description: 'Real observation records against five standard domains (planning, classroom management, delivery, assessment, professional responsibilities).' },
  { key: 'lesson_monitoring', label: 'Lesson Monitoring', description: 'Every observation status-tracked from Scheduled through Completed to any required follow-up.' },
  { key: 'professional_development', label: 'Professional Development', description: 'A real log of training completed, by provider and hours, per teacher.' },
  { key: 'performance_reviews', label: 'Performance Reviews', description: 'Periodic reviews with a real four-tier rating scale, strengths, and named growth areas.' },
  { key: 'growth_plans', label: 'Growth Plans & Metrics', description: 'Growth areas from each review are the real input to that teacher’s next observation cycle — not a separate invented metric.' },
];

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
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
    const { granted, scope } = checkGrants(grants, 'teacher_performance', 'V', null);
    if (!granted) return json({ error: 'Your role does not include teacher-performance visibility.' }, 403);
    const ownRecordOnly = /own record only/i.test(scope || '');
    const viewable = grants.filter((g) => hasPermission(g.roleCode, 'teacher_performance', 'V').granted);
    const unscoped = viewable.some((g) => g.institutionId == null);

    const categoriesRes = await sql`SELECT code, label, description FROM teacher_performance_categories ORDER BY sort_order`;
    const framework = {
      status: 'Operational Framework Ready',
      subCapabilities: SUB_CAPABILITIES,
      observationDomains: categoriesRes.rows.map((r) => ({ code: r.code, label: r.label, description: r.description })),
    };

    let obsWhere = sql``, reviewWhere = sql``;
    if (ownRecordOnly) {
      obsWhere = sql`WHERE o.teacher_staff_id = ${staffId}`;
      reviewWhere = sql`WHERE r.teacher_staff_id = ${staffId}`;
    } else if (!unscoped) {
      const institutionIds = [...new Set(viewable.map((g) => g.institutionId).filter((x) => x != null))];
      if (!institutionIds.length) {
        return json({ ok: true, framework, currentRecords: 0, observations: [], pdRecords: [], reviews: [] });
      }
      obsWhere = sql`WHERE o.institution_id = ANY(${institutionIds})`;
      reviewWhere = sql`WHERE r.institution_id = ANY(${institutionIds})`;
    }

    const [obsRes, reviewRes] = await Promise.all([
      sql`SELECT o.*, t.full_name AS teacher_name, ob.full_name AS observer_name, cat.label AS category_label
          FROM teacher_observations o
          LEFT JOIN staff t ON t.id = o.teacher_staff_id
          LEFT JOIN staff ob ON ob.id = o.observer_staff_id
          LEFT JOIN teacher_performance_categories cat ON cat.id = o.category_id
          ${obsWhere} ORDER BY o.observed_at DESC`,
      sql`SELECT r.*, t.full_name AS teacher_name, rv.full_name AS reviewer_name
          FROM teacher_reviews r
          LEFT JOIN staff t ON t.id = r.teacher_staff_id
          LEFT JOIN staff rv ON rv.id = r.reviewer_staff_id
          ${reviewWhere} ORDER BY r.created_at DESC`,
    ]);

    const teacherIds = ownRecordOnly ? [staffId] : [...new Set([...obsRes.rows.map((r) => r.teacher_staff_id), ...reviewRes.rows.map((r) => r.teacher_staff_id)])];
    const pdRes = teacherIds.length
      ? await sql`SELECT * FROM teacher_pd_records WHERE teacher_staff_id = ANY(${teacherIds}) ORDER BY completed_at DESC NULLS LAST`
      : { rows: [] };

    return json({
      ok: true, framework,
      currentRecords: obsRes.rows.length + reviewRes.rows.length + pdRes.rows.length,
      observations: obsRes.rows.map((r) => ({
        id: r.id, observationNo: r.observation_no, teacher: r.teacher_name, observer: r.observer_name,
        category: r.category_label, rating: r.rating, status: r.status, notes: r.notes, observedAt: r.observed_at,
      })),
      pdRecords: pdRes.rows.map((r) => ({ id: r.id, teacherStaffId: r.teacher_staff_id, title: r.title, provider: r.provider, hours: r.hours, completedAt: r.completed_at })),
      reviews: reviewRes.rows.map((r) => ({
        id: r.id, reviewNo: r.review_no, teacher: r.teacher_name, reviewer: r.reviewer_name, reviewPeriod: r.review_period,
        overallRating: r.overall_rating, strengths: r.strengths, growthAreas: r.growth_areas, status: r.status, createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('staff teacher-performance GET error', err);
    return json({ error: 'Could not load the Teacher Performance Framework right now — please try again shortly.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);

  try {
    if (body.action === 'record-observation') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'teacher_performance', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to record a classroom observation.' }, 403);
      if (!Number.isInteger(body.teacherStaffId) || !body.categoryCode || typeof body.notes !== 'string' || !body.notes.trim()) {
        return json({ error: 'teacherStaffId (number), categoryCode, and non-empty notes are required.' }, 400);
      }
      const catRes = await sql`SELECT id FROM teacher_performance_categories WHERE code = ${body.categoryCode}`;
      if (!catRes.rows.length) return json({ error: 'Unknown observation domain code.' }, 400);

      const year = new Date().getFullYear();
      // TD-2: candidate + INSERT retried together on a unique-violation
      // (docs/technical-debt-register.md).
      const obsOutcome = await generateWithRetryOnConflict(
        sql,
        async () => {
          const countRes = await sql`SELECT COUNT(*)::int AS n FROM teacher_observations WHERE EXTRACT(YEAR FROM observed_at) = ${year}`;
          return `SHR-TO-${year}-${String((countRes.rows[0].n || 0) + 1).padStart(5, '0')}`;
        },
        (no) => sql`
          INSERT INTO teacher_observations (observation_no, teacher_staff_id, institution_id, category_id, observer_staff_id, notes)
          VALUES (${no}, ${body.teacherStaffId}, ${body.institutionId || null}, ${catRes.rows[0].id}, ${staffId}, ${body.notes.trim()})
          RETURNING id`
      );
      const observationNo = obsOutcome.value;
      const inserted = obsOutcome.result;
      await sql`INSERT INTO teacher_performance_log (target_type, target_id, action, actor_staff_id) VALUES ('observation', ${inserted.rows[0].id}, 'scheduled', ${staffId})`;
      return json({ ok: true, observationId: inserted.rows[0].id, observationNo });
    }

    if (body.action === 'log-pd') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'teacher_performance', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to log professional development.' }, 403);
      if (!Number.isInteger(body.teacherStaffId) || typeof body.title !== 'string' || !body.title.trim()) {
        return json({ error: 'teacherStaffId (number) and a non-empty title are required.' }, 400);
      }
      const inserted = await sql`
        INSERT INTO teacher_pd_records (teacher_staff_id, title, provider, hours, completed_at)
        VALUES (${body.teacherStaffId}, ${body.title.trim()}, ${body.provider || null}, ${body.hours || null}, ${body.completedAt || null})
        RETURNING id`;
      return json({ ok: true, pdRecordId: inserted.rows[0].id });
    }

    if (body.action === 'start-review') {
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'teacher_performance', 'C', body.institutionId || null);
      if (!granted) return json({ error: 'Your role does not have authority to start a performance review.' }, 403);
      if (!Number.isInteger(body.teacherStaffId) || typeof body.reviewPeriod !== 'string' || !body.reviewPeriod.trim()) {
        return json({ error: 'teacherStaffId (number) and a non-empty reviewPeriod are required.' }, 400);
      }
      const year = new Date().getFullYear();
      // TD-2: candidate + INSERT retried together on a unique-violation
      // (docs/technical-debt-register.md).
      const reviewOutcome = await generateWithRetryOnConflict(
        sql,
        async () => {
          const countRes = await sql`SELECT COUNT(*)::int AS n FROM teacher_reviews WHERE EXTRACT(YEAR FROM created_at) = ${year}`;
          return `SHR-TR-${year}-${String((countRes.rows[0].n || 0) + 1).padStart(5, '0')}`;
        },
        (no) => sql`
          INSERT INTO teacher_reviews (review_no, teacher_staff_id, institution_id, review_period, reviewer_staff_id)
          VALUES (${no}, ${body.teacherStaffId}, ${body.institutionId || null}, ${body.reviewPeriod.trim()}, ${staffId})
          RETURNING id`
      );
      const reviewNo = reviewOutcome.value;
      const inserted = reviewOutcome.result;
      await sql`INSERT INTO teacher_performance_log (target_type, target_id, action, actor_staff_id) VALUES ('review', ${inserted.rows[0].id}, 'scheduled', ${staffId})`;
      return json({ ok: true, reviewId: inserted.rows[0].id, reviewNo });
    }

    if (body.action === 'update-observation' || body.action === 'update-review') {
      const isObs = body.action === 'update-observation';
      const idField = isObs ? 'observationId' : 'reviewId';
      const table = isObs ? 'teacher_observations' : 'teacher_reviews';
      if (!Number.isInteger(body[idField])) return json({ error: `${idField} (number) is required.` }, 400);

      const rowRes = await sql(`SELECT id, institution_id, status FROM ${table} WHERE id = $1`, [body[idField]]);
      const target = rowRes.rows[0];
      if (!target) return json({ error: 'No matching record found.' }, 404);
      const { granted } = checkGrants(await effectiveGrants(sql, staffId), 'teacher_performance', 'E', target.institution_id);
      if (!granted) return json({ error: 'Your role does not have authority to update this record.' }, 403);

      if (isObs) {
        const VALID = ['scheduled', 'completed', 'follow_up_required', 'closed'];
        const nextStatus = VALID.includes(body.status) ? body.status : target.status;
        await sql`UPDATE teacher_observations SET status = ${nextStatus}, rating = COALESCE(${body.rating || null}, rating), updated_at = now() WHERE id = ${body[idField]}`;
        await sql`INSERT INTO teacher_performance_log (target_type, target_id, action, actor_staff_id, notes) VALUES ('observation', ${body[idField]}, ${body.logAction || 'completed'}, ${staffId}, ${body.notes || null})`;
      } else {
        const VALID = ['scheduled', 'in_progress', 'completed', 'acknowledged'];
        const nextStatus = VALID.includes(body.status) ? body.status : target.status;
        await sql`
          UPDATE teacher_reviews SET status = ${nextStatus}, overall_rating = COALESCE(${body.overallRating || null}, overall_rating),
            strengths = COALESCE(${body.strengths || null}, strengths), growth_areas = COALESCE(${body.growthAreas || null}, growth_areas), updated_at = now()
          WHERE id = ${body[idField]}`;
        await sql`INSERT INTO teacher_performance_log (target_type, target_id, action, actor_staff_id, notes) VALUES ('review', ${body[idField]}, ${body.logAction || 'completed'}, ${staffId}, ${body.notes || null})`;
      }
      return json({ ok: true, [idField]: body[idField] });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('staff teacher-performance POST error', err);
    return json({ error: 'Could not save that action right now — please try again shortly.' }, 500);
  }
}
