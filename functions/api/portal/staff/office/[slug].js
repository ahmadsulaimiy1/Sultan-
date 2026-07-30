// Institutional Portal Ecosystem — the one data endpoint every office
// portal page (see js/portal-office.js) renders from. Session-gated
// (any authenticated staff member), not public: office directory
// information (who holds the seat, what the office does) is an
// internal-institution resource, not published outside the staff
// portal.
//
// Returns the office record, its current appointment(s) — including
// honest vacant seats, since office_appointments.staff_id can be NULL —
// its meetings and documents (both start empty per office and only grow
// through the admin panel, never fabricated here), and, where a real
// SYSTEM_AREA maps to this office, its pending workflow queue via the
// existing generic Approval Workflow engine. Offices with no such
// mapping get an honest empty queue, not an invented one. Also returns
// this office's committee sub-offices (if any) and its resolutions
// register — both start empty/vacant like everything else here; see
// docs/institutional-portal-architecture.md's "Level 3 Institutional
// Framework" section.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { listPendingApprovals } from '../../../../_lib/approvals.js';

// Only offices with a real, already-governed permission area get a
// workflow queue wired in — everything else honestly has none yet.
const OFFICE_AREA_CODE = {
  certificates: 'certificates',
  registrar: 'transcripts',
  admissions: 'admissions',
  finance: 'finance',
};

export async function onRequestGet({ request, env, params }) {
  if (!env.SESSION_SECRET) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) {
    return json({ error: 'Not signed in.' }, 401);
  }
  const sql = getSql(env);
  if (!sql) {
    return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);
  }

  const slug = params && params.slug;
  if (!slug) {
    return json({ error: 'Office slug is required.' }, 400);
  }

  try {
    const officeRes = await sql`
      SELECT o.id, o.name, o.office_type, o.office_kind, o.layer, o.slug, o.description, o.parent_office_id,
             o.strategic_priorities, o.annual_objectives, p.name AS parent_office_name
      FROM offices o
      LEFT JOIN offices p ON p.id = o.parent_office_id
      WHERE o.slug = ${slug} AND o.is_active = true`;
    const office = officeRes.rows[0];
    if (!office) {
      return json({ error: 'No office found with that slug.' }, 404);
    }

    const [appointmentsRes, staffCountRes, meetingsRes, documentsRes, committeesRes, resolutionsRes] = await Promise.all([
      sql`
        SELECT oa.id, oa.appointment_title, oa.is_acting, oa.is_primary, oa.started_at, oa.notes,
               s.id AS staff_id, s.staff_no, s.full_name, s.preferred_name, s.position_title,
               s.photo_url, s.bio, s.public_email, s.public_phone
        FROM office_appointments oa
        LEFT JOIN staff s ON s.id = oa.staff_id
        WHERE oa.office_id = ${office.id} AND oa.ended_at IS NULL
        ORDER BY oa.is_primary DESC, oa.started_at ASC NULLS LAST`,
      sql`SELECT COUNT(*)::int AS n FROM staff WHERE office_id = ${office.id} AND status = 'active'`,
      sql`
        SELECT id, title, meeting_date, agenda_text, minutes_text, status, created_at
        FROM office_meetings WHERE office_id = ${office.id}
        ORDER BY meeting_date DESC LIMIT 25`,
      sql`
        SELECT id, title, file_url, external_url, description, created_at
        FROM office_documents WHERE office_id = ${office.id}
        ORDER BY created_at DESC LIMIT 50`,
      sql`
        SELECT id, name, slug FROM offices
        WHERE parent_office_id = ${office.id} AND office_kind = 'committee' AND is_active = true
        ORDER BY name ASC`,
      sql`
        SELECT id, resolution_number, title, status, summary_text, resolved_at, created_at
        FROM office_resolutions WHERE office_id = ${office.id}
        ORDER BY created_at DESC LIMIT 50`,
    ]);

    const areaCode = OFFICE_AREA_CODE[office.slug];
    const pendingApprovals = areaCode
      ? (await listPendingApprovals(sql, { areaCode })).map((r) => ({
          id: r.id, targetType: r.target_type, requestedByName: r.requested_by_name, requestedAt: r.requested_at,
        }))
      : [];

    const appointments = appointmentsRes.rows.map((r) => ({
      id: r.id,
      title: r.appointment_title,
      isActing: r.is_acting,
      isPrimary: r.is_primary,
      startedAt: r.started_at,
      notes: r.notes,
      isVacant: !r.staff_id,
      staff: r.staff_id ? {
        staffNo: r.staff_no,
        fullName: r.full_name,
        preferredName: r.preferred_name,
        positionTitle: r.position_title,
        photoUrl: r.photo_url,
        bio: r.bio,
        publicEmail: r.public_email,
        publicPhone: r.public_phone,
      } : null,
    }));

    return json({
      office: {
        id: office.id,
        name: office.name,
        officeType: office.office_type,
        officeKind: office.office_kind,
        layer: office.layer,
        slug: office.slug,
        description: office.description,
        parentOfficeName: office.parent_office_name,
        strategicPriorities: office.strategic_priorities,
        annualObjectives: office.annual_objectives,
      },
      appointments,
      staffCount: staffCountRes.rows[0].n,
      meetings: meetingsRes.rows.map((r) => ({
        id: r.id, title: r.title, meetingDate: r.meeting_date, agendaText: r.agenda_text,
        minutesText: r.minutes_text, status: r.status, createdAt: r.created_at,
      })),
      documents: documentsRes.rows.map((r) => ({
        id: r.id, title: r.title, fileUrl: r.file_url, externalUrl: r.external_url,
        description: r.description, createdAt: r.created_at,
      })),
      committees: committeesRes.rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
      resolutions: resolutionsRes.rows.map((r) => ({
        id: r.id, resolutionNumber: r.resolution_number, title: r.title, status: r.status,
        summaryText: r.summary_text, resolvedAt: r.resolved_at, createdAt: r.created_at,
      })),
      workflow: { areaCode: areaCode || null, pending: pendingApprovals },
    });
  } catch (err) {
    console.error('office portal data error', err);
    return json({ error: 'Could not load this office: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
