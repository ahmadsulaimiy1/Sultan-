// Institutional Writing & Document Intelligence Centre — Writing
// Intelligence. draft.js turns notes into a first version; this
// endpoint is everything that happens AFTER that: rewrite, simplify,
// expand, proofread, change tone, restructure, translate, summarise,
// reformat, or convert to a different document type — the fuller verb
// list the Writing Centre is meant to support, not just one-shot
// drafting. Same Anthropic call pattern as draft.js and chat.js;
// operates purely on the HTML body text handed to it, so it needs no
// database schema beyond what already exists (no new table, no new
// column) — it works today regardless of what's live on the database.
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { sanitizeCorrespondenceHtml } from '../../../../_lib/sanitize-html.js';
import { correspondenceTypeLabel } from '../../../../_lib/correspondence-shell.js';
import { DOCUMENT_TYPES } from '../../../../_lib/correspondence-types.js';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 2560;
const MAX_BODY_CHARS = 12000;
const MAX_INSTRUCTION_CHARS = 600;

// Named quick actions the UI offers as one-click buttons — each maps to
// a precise instruction rather than a vague label, so "Simplify" means
// the same specific thing every time it's used. `instruction` (free
// text) is always also accepted for anything not covered here,
// including a custom translation target language.
const QUICK_ACTIONS = {
  simplify: 'Simplify the language: shorter sentences, plainer words, easier to read at a glance — without losing any fact or nuance.',
  expand: 'Expand this: add appropriate supporting detail and complete any thought that is stated too tersely — but do not invent any new fact, figure, or claim not already present or clearly implied.',
  proofread: 'Proofread and tighten: fix grammar, punctuation, and awkward phrasing; remove redundancy; do not change the meaning or add/remove substantive content.',
  more_formal: 'Raise the register: make this read as more formal and institutional — full sentences, no contractions, more precise word choice.',
  more_diplomatic: 'Make this more diplomatic: soften anything that could read as blunt or confrontational while keeping every fact and the substance of the message intact.',
  more_concise: 'Make this more concise and executive: cut every word that is not doing work, lead with the point, short paragraphs.',
  summarize: 'Summarise this into a much shorter version that preserves only the essential points — roughly a quarter of the original length.',
  improve_structure: 'Restructure this for clarity: reorganise into a more logical order, break up dense paragraphs, and use a list where the content is naturally itemised — without changing what it says.',
};

function buildRevisionPrompt({ instruction, currentDocumentType, targetDocumentType, bodyHtml }) {
  const conversionLine = targetDocumentType && targetDocumentType !== currentDocumentType
    ? `\nCONVERT THE DOCUMENT TYPE: this is currently drafted as a ${correspondenceTypeLabel(currentDocumentType)}; restructure it to read as a proper ${correspondenceTypeLabel(targetDocumentType)} instead — matching that type's own conventions (e.g. a memo leads with the point and drops any salutation; a notice is short and states one thing plainly; minutes are a numbered record of what was discussed).\n`
    : '';

  return `You are revising the body of an existing institutional document for Sultan Hanafi Royal Schools. Apply exactly the instruction below to the existing HTML body — do this instruction and nothing else beyond what it implies; do not restart the document from scratch, do not add content the instruction doesn't call for.

INSTRUCTION: ${instruction}
${conversionLine}
RULES — not optional:
- Never invent a fact, name, date, or number not already present in the text below.
- Preserve every fact and substantive point already in the text unless the instruction specifically asks to remove or shorten it.
- Output valid HTML using ONLY these tags: <p>, <ul>, <ol>, <li>, <strong>, <em>, <b>, <i>, <u>, <br>. No <html>/<head>/<body>, no markdown, no commentary — output ONLY the revised HTML body, nothing before or after it.

EXISTING DOCUMENT BODY:
"""
${bodyHtml}
"""`;
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

  const body = await readJsonBody(request);
  const bodyHtml = typeof body.bodyHtml === 'string' ? body.bodyHtml.trim().slice(0, MAX_BODY_CHARS) : '';
  const quickAction = typeof body.quickAction === 'string' ? QUICK_ACTIONS[body.quickAction] : null;
  const customInstruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, MAX_INSTRUCTION_CHARS) : '';
  const targetLang = typeof body.targetLang === 'string' && body.targetLang.trim() ? body.targetLang.trim().slice(0, 60) : null;
  const currentDocumentType = DOCUMENT_TYPES.includes(body.currentDocumentType) ? body.currentDocumentType : 'letter';
  const targetDocumentType = DOCUMENT_TYPES.includes(body.targetDocumentType) ? body.targetDocumentType : null;

  if (!bodyHtml) return json({ error: 'There is no document body to revise yet.' }, 400);

  let instruction = quickAction || customInstruction;
  if (targetLang) {
    instruction = instruction
      ? `${instruction} Also translate the result into ${targetLang}.`
      : `Translate this into ${targetLang}, producing a natural, institutionally appropriate translation — not a literal word-for-word one.`;
  }
  if (targetDocumentType && targetDocumentType !== currentDocumentType && !instruction) {
    instruction = `Restructure this to read as a proper ${correspondenceTypeLabel(targetDocumentType)}.`;
  }
  if (!instruction) return json({ error: 'Choose a quick action, write an instruction, or pick a language to translate to.' }, 400);

  const prompt = buildRevisionPrompt({ instruction, currentDocumentType, targetDocumentType, bodyHtml });

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
    console.error('Writing Centre revise: Anthropic API error', upstream.status, detail);
    return json({ error: 'The drafting service is temporarily unavailable. Please try again shortly.' }, 502);
  }

  const data = await upstream.json();
  const rawHtml = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();

  return json({ bodyHtml: sanitizeCorrespondenceHtml(rawHtml) });
}
