// Institutional Writing & Document Intelligence Centre — drafting step.
// Staff paste rough notes (bullet points, a voice transcript, half a
// thought); this turns them into a polished body for one of the
// document types in correspondence-types.js, grounded in which office
// is issuing it, what register they asked for, and real facts queried
// from the platform's own staff/office records (never invented ones).
// It does NOT save anything — the caller gets bodyHtml/title/subject
// back (or, if the notes are missing something essential, a small set
// of clarifying questions instead) and decides what to do with it: edit
// further, hand it to revise.js for a specific transformation, or POST
// it to save.js as a draft. Reuses the exact Anthropic fetch pattern
// already proven in functions/api/chat.js; this is a second, staff-
// only, non-streaming caller of the same API, not a new integration.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { staffCanActOnOffice } from '../../../../_lib/office-access.js';
import { correspondenceTypeLabel } from '../../../../_lib/correspondence-shell.js';
import { sanitizeCorrespondenceHtml } from '../../../../_lib/sanitize-html.js';
import { institutionByDbName } from '../../../../_lib/institutions.js';
import { DOCUMENT_TYPES } from '../../../../_lib/correspondence-types.js';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 2560;
const MAX_NOTES_CHARS = 6000;

const TONE_INSTRUCTIONS = {
  professional: 'A warm but professional register — clear, courteous, no jargon.',
  diplomatic: 'A diplomatic register — measured, tactful, careful not to overstate or claim more than the facts given support.',
  formal: 'A formal, institutional register — full sentences, no contractions, precise and impersonal.',
  executive: 'An executive register — concise, decisive, structured for a busy senior reader; short paragraphs, no padding.',
  academic: 'An academic register — precise terminology, measured claims, a scholarly cadence appropriate to an educational institution.',
  legal: 'A legally precise register — exact, unambiguous terms, careful about what is a fact versus what is an allegation or a decision still open to review, no loose colloquial phrasing.',
  persuasive: 'A persuasive register — makes the strongest honest case the notes actually support, with a clear ask, but never invents a benefit, statistic, or urgency the notes did not state.',
  friendly: 'A friendly, approachable register — still correct and institutional, but warmer and more conversational than "formal"; short sentences, plain words.',
  royal_formal: 'A royal-formal register — ceremonial and dignified, third-person where natural ("the Board", "the School"), the most elevated register this institution uses; reserve for occasions that genuinely warrant it, never routine business.',
  government_circular: 'A government-circular register — terse, numbered/enumerated where the content allows it, states an instruction or policy plainly with no persuasive framing, addressed to "All [recipients]" as a class rather than an individual.',
  board_resolution: 'A board-resolution register — states what was RESOLVED as a direct, numbered resolution statement (e.g. "RESOLVED THAT..."), with any preceding context kept brief and factual ("WHEREAS..." only if the notes actually establish that context) — do not narrate a resolution the notes don\'t actually state was passed.',
  policy_manual: 'A policy-manual register — impersonal, rule-stating, present tense ("Staff shall...", "Requests are..."), organised as discrete numbered clauses rather than flowing prose wherever the content is naturally rule-like.',
  public_communication: 'A public-communication register — written for a reader outside the institution with no assumed prior context, plain and welcoming without being informal, and does not use internal jargon, role codes, or acronyms without spelling them out.',
  administrative: 'An administrative register — plain, procedural, and neutral; states facts, dates, and required actions with no rhetorical flourish, the way an internal process notice or a routine confirmation reads.',
};

// Each entry pairs a structural description (folded into the prompt)
// with whether the type genuinely needs a named recipient before it
// can be drafted honestly — used by the clarifying-question pass below
// rather than hardcoding "letters need a recipient" as a separate list
// that could drift from this one.
const DOCUMENT_TYPE_GUIDANCE = {
  letter: { needsRecipient: true, text: 'A formal letter, addressed to a named recipient, with an opening and a closing.' },
  memo: { needsRecipient: false, text: 'An internal memorandum — lead with the point in the first sentence, then supporting detail. No salutation/closing needed; addressed by role, not by personal greeting.' },
  circular: { needsRecipient: false, text: 'A circular being sent to a group (a whole office, department, or the wider staff/student body) — state clearly who it applies to and what they need to do or know.' },
  notice: { needsRecipient: false, text: 'A short, formal notice — the shortest of the types, stating one fact or instruction plainly, with no elaboration beyond what is necessary.' },
  report: { needsRecipient: false, text: 'A structured report: a brief opening summary of what it covers, then the body organised under its own natural sections (background, findings/activity, conclusion/recommendation as applicable) — use <ul>/<ol> for any itemised findings or recommendations rather than burying them in a paragraph.' },
  minutes: { needsRecipient: false, text: 'Minutes of a meeting: state the meeting\'s subject and who it concerns in the opening line, then record what was discussed and decided as a numbered list of items in the order raised. Never invent an attendee, a vote, or a decision not present in the notes — if the notes don\'t give a decision on an item, record it as discussed but undecided.' },
  appointment_letter: { needsRecipient: true, text: 'A letter of appointment: states the role/position being offered or confirmed, effective date if given, and reporting line if given. Congratulatory but precise — no invented start date, salary, or terms beyond what the notes state.' },
  warning_letter: { needsRecipient: true, text: 'A formal letter of warning: states the specific conduct/performance concern factually (no character attack), any prior discussion referenced in the notes, and the expectation going forward. Serious, measured, procedurally fair register — never inflammatory, never a punishment beyond what the notes describe.' },
  promotion_letter: { needsRecipient: true, text: 'A letter of promotion: confirms the new role/title and effective date if given, briefly acknowledges the basis for it if the notes state one, states any new reporting line if given. Warm but dignified, not effusive.' },
  invitation: { needsRecipient: true, text: 'A formal invitation: what the occasion is, when and where (exactly as given — never invent a date, time, or venue), and how to respond if the notes mention an RSVP.' },
  press_release: { needsRecipient: false, text: 'A press release: a clear headline-style opening line stating the news, then the substantive detail, written for an external reader with no prior context — do not assume the reader already knows the school. No promotional superlatives beyond what the notes support.' },
  proposal: { needsRecipient: false, text: 'A proposal: what is being proposed, why (the need or opportunity, as stated in the notes), and what it would involve — organised so a decision-maker can see the ask clearly. Use a list for distinct components if the notes describe several.' },
};

function buildDraftingPrompt({ officeName, institutionName, documentType, tone, knownFacts, recipientName, recipientRole, notes }) {
  const toneLine = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
  const guidance = DOCUMENT_TYPE_GUIDANCE[documentType] || DOCUMENT_TYPE_GUIDANCE.letter;
  const recipientLine = recipientName
    ? `It is addressed to ${recipientName}${recipientRole ? ` (${recipientRole})` : ''}.`
    : guidance.needsRecipient
      ? 'No specific recipient was named. If the notes name one, use it; otherwise this is missing information — see the needs_info rule below.'
      : 'No specific recipient was named — write it addressed generally, appropriate to the document type.';

  return `You are drafting an official ${correspondenceTypeLabel(documentType)} on behalf of the ${officeName} of ${institutionName}, a real school in Ikorodu, Lagos State, Nigeria.

DOCUMENT TYPE: ${guidance.text}
REGISTER: ${toneLine}
${recipientLine}

KNOWN FACTS (queried from the platform's own records — you may cite these where relevant, e.g. naming the drafter or the office holder as the issuing authority, but they do not license you to invent anything else): ${knownFacts || 'None available.'}

RULES — these are not optional:
- State only what the staff member's notes below, or the known facts above, actually say. Never invent a fact, a date, a name, a number, or a claim that isn't in one of those two sources.
- Do not fabricate letterhead elements — no date line, no reference number, no signature block, no "Dear Sir/Madam" salutation-and-closing boilerplate. Those are added separately by the system. Write ONLY the substantive body.
- Do not claim any government approval, ministry endorsement, award, or affiliation that isn't stated in the notes.
- Output valid HTML body content only where you do draft: a sequence of <p>...</p> paragraphs (and <ol>/<ul><li> where the notes are naturally a list). No <html>, <head>, <body>, or markdown — just the paragraph/list markup itself.
- Keep the institution's voice dignified and precise, never salesy, never exaggerated.

BEFORE drafting, judge whether the notes actually give you enough to write an honest, complete document of this type — not just "could I write something", but "would this be missing something a reader would need" (this document type needing a named recipient and none being given or inferable from the notes is one clear case; a fact central to the document type — a date for a notice/invitation, an effective date for an appointment/promotion letter, the specific concern for a warning letter — being entirely absent is another). Minor omissions that don't change what the document needs to say are NOT a reason to ask — only ask when drafting without the answer would mean guessing or leaving the document useless.

Respond in ONE of exactly two shapes. First line is always a single-line JSON object, then a blank line, then (for the ready case only) the HTML body.

If you have enough to draft:
{"status": "ready", "title": "short internal title for this document", "subject": "one-line subject/purpose statement, or empty string if not applicable to this document type"}

<the HTML body>

If genuinely missing something essential:
{"status": "needs_info", "questions": ["specific question 1", "specific question 2"]}
(no HTML body follows in this case — at most 3 questions, each answerable in a short phrase)

STAFF MEMBER'S ROUGH NOTES (transform these into the polished document — do not just lightly edit them, restructure them into a properly composed document while preserving every fact and intention they contain):
"""
${notes}
"""`;
}

function parseDraftResponse(raw) {
  const trimmed = String(raw || '').trim();
  const firstNewline = trimmed.indexOf('\n');
  const firstLine = (firstNewline === -1 ? trimmed : trimmed.slice(0, firstNewline)).trim();
  const rest = (firstNewline === -1 ? '' : trimmed.slice(firstNewline)).trim();
  try {
    const meta = JSON.parse(firstLine);
    if (meta.status === 'needs_info' && Array.isArray(meta.questions)) {
      return { needsInfo: true, questions: meta.questions.filter((q) => typeof q === 'string').slice(0, 3) };
    }
    return {
      needsInfo: false,
      title: typeof meta.title === 'string' ? meta.title : '',
      subject: typeof meta.subject === 'string' ? meta.subject : '',
      bodyHtml: rest,
    };
  } catch {
    return { needsInfo: false, title: '', subject: '', bodyHtml: trimmed };
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
  const documentType = DOCUMENT_TYPES.includes(body.documentType) ? body.documentType : null;
  const tone = TONE_INSTRUCTIONS[body.tone] ? body.tone : 'professional';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, MAX_NOTES_CHARS) : '';
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim().slice(0, 200) : '';
  const recipientRole = typeof body.recipientRole === 'string' ? body.recipientRole.trim().slice(0, 200) : '';

  if (!Number.isInteger(officeId)) return json({ error: 'officeId is required.' }, 400);
  if (!documentType) return json({ error: `documentType must be one of ${DOCUMENT_TYPES.join(', ')}.` }, 400);
  if (!notes) return json({ error: 'Paste some notes for the assistant to draft from.' }, 400);

  const canAct = await staffCanActOnOffice(sql, session.staffId, officeId);
  if (!canAct) return json({ error: 'You do not currently hold this office.' }, 403);

  const [officeRes, drafterRes, holderRes] = await Promise.all([
    sql`SELECT o.name AS office_name, i.name AS institution_name
        FROM offices o LEFT JOIN institutions i ON i.id = o.institution_id
        WHERE o.id = ${officeId}`,
    sql`SELECT full_name, position_title FROM staff WHERE id = ${session.staffId}`,
    sql`SELECT s.full_name, oa.appointment_title FROM office_appointments oa
        JOIN staff s ON s.id = oa.staff_id
        WHERE oa.office_id = ${officeId} AND oa.ended_at IS NULL AND oa.is_primary = true
        ORDER BY oa.started_at DESC NULLS LAST LIMIT 1`,
  ]);
  const office = officeRes.rows[0];
  if (!office) return json({ error: 'Office not found.' }, 404);
  const specificInstitution = institutionByDbName(office.institution_name);
  const institutionName = specificInstitution ? specificInstitution.displayName : 'Sultan Hanafi Royal Schools';

  // Real, queried facts the model may cite if relevant — never a
  // licence to state anything else as fact. This is the same honesty
  // boundary SITE_FACTS draws for the public assistant (functions/_lib/
  // assistant.js); the Writing Centre gets its own small, office-scoped
  // slice of it rather than the whole public fact sheet, since most of
  // a report/letter/memo turns on who is drafting and who holds the
  // office, not the school's admissions process.
  const drafter = drafterRes.rows[0];
  const holder = holderRes.rows[0];
  const knownFacts = [
    drafter ? `The staff member drafting this is ${drafter.full_name}${drafter.position_title ? `, ${drafter.position_title}` : ''}.` : null,
    holder ? `The current holder of the ${office.office_name} is ${holder.full_name}, ${holder.appointment_title}.` : `The ${office.office_name} has no staff member currently appointed to it on record.`,
  ].filter(Boolean).join(' ');

  const prompt = buildDraftingPrompt({
    officeName: office.office_name,
    institutionName,
    documentType,
    tone,
    knownFacts,
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
  const parsed = parseDraftResponse(rawText);

  if (parsed.needsInfo) {
    return json({
      needsInfo: true, questions: parsed.questions,
      officeName: office.office_name, institutionName, documentType, tone,
    });
  }

  return json({
    needsInfo: false, title: parsed.title, subject: parsed.subject,
    bodyHtml: sanitizeCorrespondenceHtml(parsed.bodyHtml),
    officeName: office.office_name,
    institutionName,
    documentType, tone,
  });
}
