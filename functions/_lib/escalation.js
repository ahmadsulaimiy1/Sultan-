// Human escalation — the assistant's way of saying "I should not be the
// one answering this" and getting a real person involved.
//
// Why this exists: the assistant is honest about what isn't published,
// but honesty is not enough on its own. A parent asking about a fee
// dispute, a child's welfare, a complaint about a member of staff, or
// anything about one named child does not want a correct statement that
// the information isn't published — they want a person. Before this,
// the assistant's best possible answer to those was a polite dead end.
//
// How it works: the system prompt tells the model to end its reply with
// a marker line when it decides a human is needed. The marker never
// reaches the visitor — chat.js filters it out of the stream and
// whatsapp.js strips it from the reply — it only triggers the record
// below. The model still writes its own human sentence first, so what
// the visitor reads is written for them, not generated from a template.
//
// Everything here is best-effort and never throws, the same discipline
// notifications.js and email.js already follow: an escalation that
// fails to record must never break the reply the visitor is reading.
//
// Honesty rules baked in:
//   - No response-time promise. We do not control when staff read the
//     portal, so the assistant is told to say the office will be told,
//     not that anyone will call within an hour.
//   - The row is written even when no staff are appointed to the
//     receiving office and even when email is unconfigured, so the
//     escalation is never silently lost. `delivered_to` records how
//     many people were actually reached — 0 is a real, visible answer.

import { getSql } from './db.js';
import { sendEmail } from './email.js';
import { notifyStaffMany, staffForOffice } from './notifications.js';

// Pipe-delimited rather than JSON: a malformed brace would cost us the
// whole escalation, whereas a split on '|' degrades to "we still know
// the topic". The payload is captured whole and split afterwards, so an
// extra '|' the model slips into its summary cannot stop the marker
// matching — if it did, the marker would leak to the visitor, which is
// the one failure mode worth engineering against. Leading whitespace
// and case are tolerated for the same reason.
const MARKER_RE = /\[\[\s*ESCALATE\s*\|([^\]]*)\]\]/i;
const MARKER_OPEN = '[[';
const MARKER_CLOSE = ']]';
const MAX_MARKER_SPAN = 900; // past this, a '[[' was prose, not a marker

const MAX_SUMMARY = 400;
const MAX_CONTACT = 120;
const MAX_TRANSCRIPT = 4000;

// Topic -> the office slug that owns it, as seeded in sql/schema.sql.
// These are real offices with real slugs; nothing here is invented.
// `escalate_to` is the office that hears about it; `also` is a second
// office copied in where the subject genuinely spans both.
export const ESCALATION_TOPICS = {
  admissions:   { office: 'admissions',      also: 'registrar',       label: 'Admissions' },
  fees:         { office: 'finance',         also: null,              label: 'Fees & payments' },
  results:      { office: 'registrar',       also: null,              label: 'Results, transcripts & certificates' },
  welfare:      { office: 'student-affairs', also: null,              label: 'Student welfare' },
  safeguarding: { office: 'executive',       also: 'student-affairs', label: 'Safeguarding — urgent' },
  complaint:    { office: 'executive',       also: null,              label: 'Complaint' },
  general:      { office: 'executive',       also: null,              label: 'General — needs a person' },
};

const FALLBACK_OFFICE = 'executive';

/* ------------------------------------------------------- prompt text */

// Appended to every system prompt, on every channel. `channel` only
// changes whether the assistant has to ask for a contact detail: on
// WhatsApp the sender's number is already known, on the website it is
// not.
export function escalationRule(channel) {
  const contactStep = channel === 'whatsapp'
    ? 'You already have their WhatsApp number, so do not ask for contact details — escalate straight away.'
    : 'First ask for their name and either a phone number or an email address, so the office can reach them. If they decline, escalate anyway and leave the contact field empty.';

  return `
WHEN TO FETCH A HUMAN INSTEAD OF ANSWERING
Some questions should not end with you, however well you could answer them. Hand these to a person:
- anything about one named child — results, behaviour, health, attendance, welfare
- a complaint about the school, a member of staff, or a decision
- a fee dispute, a payment that has not been credited, or a request for a fee concession
- anything about a child's safety or wellbeing, or a person in distress
- any request to speak to a human, however phrased
- anything where being wrong would cost the family real money, a place, or time

How to do it:
1. Write a short, warm sentence telling them you are passing this to the right office. Do NOT promise a response time — you do not know staff hours. Say the office will be told, not that someone will call today.
2. ${contactStep}
3. Then, as the VERY LAST line of your reply, on its own line, output exactly:
[[ESCALATE|topic|one-line summary|contact]]
   - topic is exactly one of: admissions, fees, results, welfare, safeguarding, complaint, general
   - the summary is one line, for staff to read — never use the | character inside it
   - contact is their phone or email if you have it, otherwise leave it empty
4. Never mention the marker, never explain it, never show it to them, and never output it unless you are genuinely escalating.

For safeguarding — a child in danger, harm, or serious distress — do not counsel, do not ask probing questions, and do not delay. Say plainly that you are getting a person now, give the school's number +234 807 374 7650 for anything immediate, and escalate with topic safeguarding.`;
}

/* --------------------------------------------------- marker handling */

function clean(value, max) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

// payload is everything between "ESCALATE|" and "]]". Expected shape is
// topic|summary|contact, but a summary containing a stray '|' would
// otherwise shift the contact field, so anything between the first and
// last separator is folded back into the summary.
function toEscalation(match) {
  const parts = String(match[1] || '').split('|');
  const topic = clean(parts[0], 40).toLowerCase();
  const summary = parts.length > 2 ? parts.slice(1, -1).join(' ') : (parts[1] || '');
  const contact = parts.length > 2 ? parts[parts.length - 1] : '';
  return {
    topic: Object.prototype.hasOwnProperty.call(ESCALATION_TOPICS, topic) ? topic : 'general',
    summary: clean(summary, MAX_SUMMARY) || 'No summary given.',
    contact: clean(contact, MAX_CONTACT) || null,
  };
}

// For the non-streaming path (WhatsApp). Returns the visitor-facing
// reply with the marker removed, plus the parsed escalation or null.
export function splitEscalation(text) {
  const source = String(text || '');
  const match = source.match(MARKER_RE);
  if (!match) return { reply: source.trim(), escalation: null };
  return {
    reply: source.replace(MARKER_RE, '').replace(/\n{3,}/g, '\n\n').trim(),
    escalation: toEscalation(match),
  };
}

// For the streaming path (the website widget). The marker must never
// reach the browser, not even for one frame, and it arrives split
// across arbitrary chunk boundaries — so text is held back from the
// moment a '[[' (or a trailing '[' that might become one) appears,
// and released again as soon as it proves not to be a marker.
export function createEscalationFilter() {
  let carry = '';
  let escalation = null;

  function drain(final) {
    let out = '';
    for (;;) {
      const open = carry.indexOf(MARKER_OPEN);

      if (open === -1) {
        // A single trailing '[' could still become '[[' on the next
        // chunk, so hold just that one character back until we know.
        if (!final && carry.endsWith('[')) {
          out += carry.slice(0, -1);
          carry = '[';
        } else {
          out += carry;
          carry = '';
        }
        return out;
      }

      out += carry.slice(0, open);
      carry = carry.slice(open);

      const close = carry.indexOf(MARKER_CLOSE);
      if (close === -1) {
        // Still open. If it has run on far past any plausible marker,
        // it was ordinary prose — release it rather than swallow it.
        if (final || carry.length > MAX_MARKER_SPAN) {
          out += carry;
          carry = '';
          return out;
        }
        return out;
      }

      const candidate = carry.slice(0, close + MARKER_CLOSE.length);
      const match = candidate.match(MARKER_RE);
      if (match) {
        if (!escalation) escalation = toEscalation(match);
      } else {
        out += candidate; // '[[...]]' that wasn't ours — pass it through
      }
      carry = carry.slice(close + MARKER_CLOSE.length);
    }
  }

  return {
    // Text safe to forward to the browser right now.
    push(chunk) { carry += chunk; return drain(false); },
    // Anything still held back once upstream closes.
    end() { return drain(true); },
    get escalation() { return escalation; },
  };
}

/* ---------------------------------------------------------- recording */

function escalationEmail(record, topicLabel) {
  const rows = [
    ['Topic', topicLabel],
    ['Channel', record.channel === 'whatsapp' ? 'WhatsApp' : 'Website assistant'],
    ['Contact given', record.contact || '— none given —'],
    ['Summary', record.summary],
  ];
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 28px;background:#FCFAF6;border:1px solid #E4D6B8;">
      <p style="font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;color:#8a6d2f;margin:0 0 10px;">Sultan Hanafi Royal Schools — Digital Assistant</p>
      <h1 style="font-size:1.25rem;color:#1D1108;margin:0 0 6px;">Someone asked for a person</h1>
      <p style="font-size:0.9rem;color:#5A4630;margin:0 0 18px;">The assistant judged that this needs a member of staff rather than an answer from it.</p>
      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;color:#2b2116;">
        ${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b5636;white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:6px 0;">${v}</td></tr>`).join('')}
      </table>
      ${record.transcript ? `<p style="font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:#8a6d2f;margin:22px 0 6px;">What was said</p><pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:0.86rem;color:#2b2116;line-height:1.55;margin:0;">${record.transcript}</pre>` : ''}
    </div>`;
  const text = [
    'Someone asked for a person.',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    record.transcript ? `\nWhat was said:\n${record.transcript}` : '',
  ].join('\n');
  return { html, text };
}

async function officeStaff(sql, slug) {
  try {
    const res = await sql`SELECT id FROM offices WHERE slug = ${slug} AND is_active = true LIMIT 1`;
    if (!res.rows.length) return [];
    return await staffForOffice(sql, res.rows[0].id);
  } catch (err) {
    console.error('escalation: office lookup failed', slug, err);
    return [];
  }
}

// Records the escalation and tries to put it in front of someone.
// Never throws. Returns what actually happened rather than a boolean,
// so the caller can log honestly.
export async function recordEscalation(env, { channel, topic, summary, contact, lang, transcript }) {
  const route = ESCALATION_TOPICS[topic] || ESCALATION_TOPICS.general;
  const record = {
    channel: channel === 'whatsapp' ? 'whatsapp' : 'web',
    topic: ESCALATION_TOPICS[topic] ? topic : 'general',
    summary: clean(summary, MAX_SUMMARY) || 'No summary given.',
    contact: contact ? clean(contact, MAX_CONTACT) : null,
    lang: clean(lang, 8) || null,
    transcript: transcript ? String(transcript).slice(0, MAX_TRANSCRIPT) : null,
  };

  const outcome = { recorded: false, notified: 0, emailed: false, id: null };
  const sql = getSql(env);

  if (sql) {
    try {
      const res = await sql`
        INSERT INTO assistant_escalations (channel, topic, summary, contact, lang, transcript)
        VALUES (${record.channel}, ${record.topic}, ${record.summary}, ${record.contact}, ${record.lang}, ${record.transcript})
        RETURNING id`;
      outcome.recorded = true;
      outcome.id = res.rows[0].id;
    } catch (err) {
      console.error('escalation: insert failed', err);
    }

    try {
      const slugs = [route.office, route.also].filter(Boolean);
      let staffIds = [];
      for (const slug of slugs) staffIds.push(...await officeStaff(sql, slug));
      // Nobody appointed to that office yet — this is a young directory,
      // so fall back rather than let the escalation reach no one.
      if (!staffIds.length && route.office !== FALLBACK_OFFICE) {
        staffIds = await officeStaff(sql, FALLBACK_OFFICE);
      }
      staffIds = [...new Set(staffIds)];

      if (staffIds.length) {
        outcome.notified = await notifyStaffMany(sql, staffIds, {
          category: 'assistant_escalation',
          title: `${route.label} — someone asked for a person`,
          message: [
            record.summary,
            record.contact ? `Contact: ${record.contact}` : 'No contact details were given.',
            `Came in over ${record.channel === 'whatsapp' ? 'WhatsApp' : 'the website assistant'}.`,
          ].join('\n'),
          targetType: 'assistant_escalation',
          targetId: outcome.id,
        });
      }
    } catch (err) {
      console.error('escalation: staff notification failed', err);
    }
  } else {
    console.error('escalation: DATABASE_URL is not set — escalation not recorded', record.topic);
  }

  try {
    const to = env.ESCALATION_EMAIL || 'info@shroyalschools.com';
    const { html, text } = escalationEmail(record, route.label);
    const res = await sendEmail(env, {
      to,
      subject: `[Assistant] ${route.label} — someone asked for a person`,
      html,
      text,
    });
    outcome.emailed = Boolean(res && res.sent);
  } catch (err) {
    console.error('escalation: email failed', err);
  }

  if (!outcome.recorded && !outcome.notified && !outcome.emailed) {
    // Last resort: at least put the whole thing in the log, where the
    // Cloudflare dashboard will show it. Better than losing a parent.
    console.error('escalation NOT DELIVERED', JSON.stringify(record));
  }
  return outcome;
}

// The last few turns, for the staff member who has to pick this up.
// Images are dropped — a staff email is not the place for them, and
// they would blow the size limit.
export function transcriptFrom(messages, limit = 6) {
  return (Array.isArray(messages) ? messages.slice(-limit) : [])
    .map((m) => {
      const content = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((b) => b && b.type === 'text').map((b) => b.text).join(' ')
          : '';
      const body = content.trim();
      if (!body) return null;
      return `${m.role === 'user' ? 'Them' : 'Assistant'}: ${body}`;
    })
    .filter(Boolean)
    .join('\n\n');
}
