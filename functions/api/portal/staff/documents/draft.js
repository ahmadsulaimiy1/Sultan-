// Institutional Writing & Document Intelligence Centre — drafting step.
// Staff paste rough notes (bullet points, a voice transcript, half a
// thought); this turns them into a polished body for one of the four
// correspondence types, grounded in which office is issuing it and
// what register they asked for. It does NOT save anything — the caller
// gets bodyHtml/title/subject back and decides what to do with it
// (edit further, then POST it to documents/index.js as a draft or
// issue it straight away). Reuses the exact Anthropic fetch pattern
// already proven in functions/api/chat.js; this is a second, staff-
// only, non-streaming caller of the same API, not a new integration.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';
import { correspondenceTypeLabel } from '../../../../_lib/correspondence-shell.js';
import { sanitizeCorrespondenceHtml } from '../../../../_lib/sanitize-html.js';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 2048;
const MAX_NOTES_CHARS = 6000;

const TONE_INSTRUCTIONS = {
  professional: 'A warm but professional register — clear, courteous, no jargon.',
  diplomatic: 'A diplomatic register — measured, tactful, careful not to overstate or claim more than the facts given support.',
  formal: 'A formal, institutional register — full sentences, no contractions, precise and impersonal.',
  executive: 'An executive register — concise, decisive, structured for a busy senior reader; short paragraphs, no padding.',
  academic: 'An academic register — precise terminology, measured claims, a scholarly cadence appropriate to an educational institution.',
};

const DOCUMENT_TYPE_GUIDANCE = {
  letter: 'A formal letter, addressed to a named recipient, with an opening and a closing.',
  memo: 'An internal memorandum — lead with the point in the first sentence, then supporting detail. No salutation/closing needed; addressed by role, not by personal greeting.',
  circular: 'A circular being sent to a group (a whole office, department, or the wider staff/student body) — state clearly who it applies to and what they need to do or know.',
  notice: 'A short, formal notice — the shortest of the four types, stating one fact or instruction plainly, with no elaboration beyond what is necessary.',
};

function buildDraftingPrompt({ officeName, institutionName, documentType, tone, recipientName, recipientRole, notes }) {
  const toneLine = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const typeLine = DOCUMENT_TYPE_GUIDANCE[documentType] || DOCUMENT_TYPE_GUIDANCE.letter;
  const recipientLine = recipientName
    ? `It is addressed to ${recipientName}${recipientRole ? ` (${recipientRole})` : ''}.`
    : 'No specific recipient was named — write it addressed generally, appropriate to the document type.';

  return `You are drafting an official ${correspondenceTypeLabel(documentType)} on behalf of the ${officeName} of ${institutionName}, a real school in Ikorodu, Lagos State, Nigeria.

DOCUMENT TYPE: ${typeLine}
REGISTER: ${toneLine}
${recipientLine}

RULES — these are not optional:
- State only what the staff member's notes below actually say. Never invent a fact, a date, a name, a number, or a claim that isn't in the notes. If the notes are missing something the document genuinely needs (a date, a recipient, a specific figure), leave a clearly marked placeholder like [DATE] or [FIGURE] rather than inventing one.
- Do not fabricate letterhead elements — no date line, no reference number, no signature block, no "Dear Sir/Madam" salutation-and-closing boilerplate. Those are added separately by the system. Write ONLY the substantive body.
- Do not claim any government approval, ministry endorsement, award, or affiliation that isn't stated in the notes.
- Output valid HTML body content only: a sequence of <p>...</p> paragraphs (and <ol>/<ul><li> where the notes are naturally a list). No <html>, <head>, <body>, or markdown — just the paragraph/list markup itself.
- Keep the institution's voice dignified and precise, never salesy, never exaggerated.

Also produce, on the very first line before the HTML, a one-line JSON object exactly in this form (then a blank line, then the HTML body):
{"title": "short internal title for this document", "subject": "one-line subject/purpose statement, or empty string if not applicable to this document type"}

STAFF MEMBER'S ROUGH NOTES (transform these into the polished document — do not just lightly edit them, restructure them into a properly composed document while preserving every fact and intention they contain):
"""
${notes}
"""`;
}

function parseDraftResponse(raw) {
  const trimmed = String(raw || '').trim();
  const firstNewline = trimmed.indexOf('\n');
  if (firstNewline === -1) return { title: '', subject: '', bodyHtml: trimmed };
  const firstLine = trimmed.slice(0, firstNewline).trim();
  const rest = trimmed.slice(firstNewline).trim();
  try {
    const meta = JSON.parse(firstLine);
    return {
      title: typeof meta.title === 'string' ? meta.title : '',
      subject: typeof meta.subject === 'string' ? meta.subject : '',
      bodyHtml: rest,
    };
  } catch {
    return { title: '', subject: '', bodyHtml: trimmed };
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: 'Portal is not configured yet.' }, 500);
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'The Writing Centre is not configured yet — an administrator needs to add ANTHROPIC_API_KEY to this deployment.' }, 500);
  }

  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) return json({ error: 'Not signed in.' }, 401);

  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const officeId = Number(body.officeId);
  const documentType = ['letter', 'memo', 'circular', 'notice'].includes(body.documentType) ? body.documentType : null;
  const tone = TONE_INSTRUCTIONS[body.tone] ? body.tone : 'professional';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, MAX_NOTES_CHARS) : '';
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim().slice(0, 200) : '';
  const recipientRole = typeof body.recipientRole === 'string' ? body.recipientRole.trim().slice(0, 200) : '';

  if (!Number.isInteger(officeId)) return json({ error: 'officeId is required.' }, 400);
  if (!documentType) return json({ error: 'documentType must be one of letter, memo, circular, notice.' }, 400);
  if (!notes) return json({ error: 'Paste some notes for the assistant to draft from.' }, 400);

  const canAct = await staffCanActOnOffice(sql, session.staffId, officeId);
  if (!canAct) return json({ error: 'You do not currently hold this office.' }, 403);

  const officeRes = await sql`
    SELECT o.name AS office_name, i.name AS institution_name
    FROM offices o LEFT JOIN institutions i ON i.id = o.institution_id
    WHERE o.id = ${officeId}`;
  const office = officeRes.rows[0];
  if (!office) return json({ error: 'Office not found.' }, 404);
  const institutionName = office.institution_name || 'Sultan Hanafi Royal Schools';

  const prompt = buildDraftingPrompt({
    officeName: office.office_name,
    institutionName,
    documentType,
    tone,
    recipientName,
    recipientRole,
    notes,
  });

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: request.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') return new Response(null, { status: 499 });
    return json({ error: 'Could not reach the drafting service. Please try again shortly.' }, 502);
  }

  if (!upstream.ok) {
    let detail = '';
    try { detail = await upstream.text(); } catch {}
    console.error('Writing Centre draft: Anthropic API error', upstream.status, detail);
    return json({ error: 'The drafting service is temporarily unavailable. Please try again shortly.' }, 502);
  }

  const data = await upstream.json();
  const rawText = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const { title, subject, bodyHtml } = parseDraftResponse(rawText);

  return json({
    title, subject, bodyHtml: sanitizeCorrespondenceHtml(bodyHtml),
    officeName: office.office_name,
    institutionName,
    documentType, tone,
  });
}
