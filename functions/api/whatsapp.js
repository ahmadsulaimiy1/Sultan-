// Cloudflare Pages Function — the Digital Academic Assistant on WhatsApp,
// reached through Twilio's WhatsApp Business API.
//
// Twilio POSTs an application/x-www-form-urlencoded webhook here every time
// somebody messages the school's WhatsApp number. We verify the request
// really came from Twilio, run the message through the SAME assistant brain
// the website widget uses (functions/_lib/assistant.js — one fact sheet, one
// honesty rule, one grounding index, so the two channels can never drift
// apart and start telling families different things), and answer with TwiML.
//
// Setup — three secrets, set by the school in the Cloudflare Pages project
// (Settings -> Variables and Secrets), never in this repository:
//   ANTHROPIC_API_KEY   required — same key the website assistant uses
//   TWILIO_AUTH_TOKEN   required — from the Twilio console; used ONLY to
//                       verify inbound signatures, never sent anywhere
//   TWILIO_ACCOUNT_SID  optional — only needed to receive photos/documents
//   TWILIO_WEBHOOK_URL  optional — the exact URL configured in Twilio, if
//                       it differs from what this Worker sees (proxies,
//                       custom domains). Signatures are computed over the
//                       URL Twilio used, so a mismatch fails verification.
//   ASSISTANT_MEMORY    optional KV namespace binding — if bound, the last
//                       few turns of each conversation are remembered for
//                       an hour so follow-up questions make sense. If it is
//                       not bound the endpoint still works, each message is
//                       simply answered on its own.
//
// Security posture: if TWILIO_AUTH_TOKEN is missing we refuse every request
// rather than accepting unverified ones. An open webhook is a stranger's
// remote control over the school's Anthropic bill.
//
// See docs/digital-assistant.md for the operator-facing setup steps.

import {
  DEFAULT_MODEL,
  buildSystemPrompt,
  retrieveRelevantPages,
  sanitizeMessages,
} from '../_lib/assistant.js';
import { recordEscalation, splitEscalation, transcriptFrom } from '../_lib/escalation.js';

const WA_MAX_TOKENS = 640;          // WhatsApp replies are short by design
const WA_SEGMENT_CHARS = 1400;      // Twilio hard-limits a body to 1600
const WA_MAX_SEGMENTS = 3;
const WA_MEMORY_TURNS = 8;          // trailing messages kept per sender
const WA_MEMORY_TTL = 3600;         // one hour, then the thread starts fresh
const WA_UPSTREAM_TIMEOUT = 12000;  // Twilio gives the webhook ~15s
const WA_MAX_MEDIA_BYTES = 1_500_000;

/* ---------------------------------------------------------------- helpers */

function twiml(body) {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/xml; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// One reply may need more than one WhatsApp message. Split on paragraph or
// sentence boundaries where we can, so a message never stops mid-word.
function segment(text) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  if (clean.length <= WA_SEGMENT_CHARS) return [clean];

  const parts = [];
  let rest = clean;
  while (rest.length && parts.length < WA_MAX_SEGMENTS) {
    if (rest.length <= WA_SEGMENT_CHARS) { parts.push(rest); break; }
    const window = rest.slice(0, WA_SEGMENT_CHARS);
    let cut = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '), window.lastIndexOf('؟ '));
    if (cut < WA_SEGMENT_CHARS * 0.5) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = WA_SEGMENT_CHARS;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  // If a reply still overruns three messages it is cut — say so with an
  // ellipsis rather than letting it stop mid-thought as though that were
  // the whole answer. The system prompt asks for ~80 words, so this is a
  // backstop, not the normal path.
  if (rest.length && parts.length) parts[parts.length - 1] += ' …';
  return parts.filter(Boolean);
}

function reply(text) {
  const segments = segment(text);
  const body = segments.length
    ? segments.map((s) => `<Message>${escapeXml(s)}</Message>`).join('')
    : '';
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`);
}

// Silence is a valid TwiML response — used when we deliberately do not want
// to answer (an unverified request has already been rejected before this).
function silence() {
  return twiml('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
}

/* ------------------------------------------------- Twilio signature check */

// Twilio signs: the full webhook URL, then every POST parameter appended in
// alphabetical order as key immediately followed by value, HMAC-SHA1 with
// the account's auth token, base64-encoded.
// https://www.twilio.com/docs/usage/security#validating-requests
async function verifyTwilioSignature(authToken, url, params, signature) {
  if (!signature) return false;
  let payload = url;
  // keys() repeats a key once per value; dedupe before getAll() so a
  // repeated parameter is not appended twice.
  for (const key of [...new Set(params.keys())].sort()) {
    for (const value of params.getAll(key)) payload += key + value;
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(authToken), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The URL Twilio signed is the one configured in its console, which is not
// always the one this Worker observes (custom domains, proxies, an https
// front to an http origin). Any query string IS part of the signed payload,
// so it is kept; only the scheme is normalised to https. TWILIO_WEBHOOK_URL
// lets the school state the exact URL if the two still disagree.
function webhookUrl(request, env) {
  if (env.TWILIO_WEBHOOK_URL) return env.TWILIO_WEBHOOK_URL;
  const url = new URL(request.url);
  url.protocol = 'https:';
  return url.toString();
}

/* ------------------------------------------------------------------ media */

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Twilio's media URLs need the account's own credentials to read. Without
// TWILIO_ACCOUNT_SID we simply cannot fetch them — we say so to the sender
// rather than pretending we looked at their photo.
async function fetchImageBlock(mediaUrl, env) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
  try {
    const res = await fetch(mediaUrl, {
      headers: { authorization: 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`) },
    });
    if (!res.ok) return null;
    const mediaType = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(jpeg|png|gif|webp)$/.test(mediaType)) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.length || buf.length > WA_MAX_MEDIA_BYTES) return null;
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data: bytesToBase64(buf) } };
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- memory */

function memoryKey(from) {
  return `wa:${from}`;
}

async function loadMemory(env, from) {
  if (!env.ASSISTANT_MEMORY || !from) return [];
  try {
    const raw = await env.ASSISTANT_MEMORY.get(memoryKey(from));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveMemory(env, from, turns) {
  if (!env.ASSISTANT_MEMORY || !from) return;
  try {
    await env.ASSISTANT_MEMORY.put(
      memoryKey(from),
      JSON.stringify(turns.slice(-WA_MEMORY_TURNS)),
      { expirationTtl: WA_MEMORY_TTL },
    );
  } catch {
    // memory is a convenience, never a dependency
  }
}

/* -------------------------------------------------------------- behaviour */

const RESET_WORDS = /^(reset|restart|start over|new chat|clear|ابدأ من جديد|مسح)$/i;

// Arabic block, plus the Arabic-Indic digits families. The site speaks four
// languages, but the assistant's system prompt distinguishes only Arabic and
// English; anything else is answered in the language the sender wrote in.
function detectLang(text) {
  return /[؀-ۿݐ-ݿ]/.test(text || '') ? 'ar' : 'en';
}

function greeting(lang) {
  return lang === 'ar'
    ? 'أهلًا بك في مدارس سلطان حنفي الملكية. أنا مساعد رقمي يعمل بالذكاء الاصطناعي — لست موظفًا. كيف يمكنني مساعدتك؟'
    : 'Welcome to Sultan Hanafi Royal Schools. I am an AI assistant, not a member of staff — I can answer questions about the schools, admissions and boarding, or help with schoolwork. How can I help?';
}

function unavailable(lang) {
  return lang === 'ar'
    ? 'المساعد غير متاح مؤقتًا. يرجى المحاولة بعد قليل أو مراسلتنا على info@shroyalschools.com.'
    : 'The assistant is briefly unavailable. Please try again shortly, or email info@shroyalschools.com.';
}

/* ------------------------------------------------------------------ route */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Fail closed: no auth token means we cannot tell Twilio from anyone else.
  if (!env.TWILIO_AUTH_TOKEN) {
    console.error('WhatsApp webhook called but TWILIO_AUTH_TOKEN is not set');
    return new Response('WhatsApp webhook is not configured.', { status: 503 });
  }

  let params;
  try {
    params = new URLSearchParams(await request.text());
  } catch {
    return new Response('Bad request.', { status: 400 });
  }

  const signature = request.headers.get('X-Twilio-Signature');
  const verified = await verifyTwilioSignature(
    env.TWILIO_AUTH_TOKEN, webhookUrl(request, env), params, signature,
  );
  if (!verified) {
    console.error('WhatsApp webhook signature rejected');
    return new Response('Invalid signature.', { status: 403 });
  }

  const from = params.get('From') || '';
  const bodyText = (params.get('Body') || '').trim();
  const lang = detectLang(bodyText);

  if (!env.ANTHROPIC_API_KEY) {
    console.error('WhatsApp webhook reached but ANTHROPIC_API_KEY is not set');
    return reply(unavailable(lang));
  }

  if (RESET_WORDS.test(bodyText)) {
    if (env.ASSISTANT_MEMORY && from) {
      try { await env.ASSISTANT_MEMORY.delete(memoryKey(from)); } catch {}
    }
    return reply(greeting(lang));
  }

  // Attachments: one image at most, and only if we are able to read it.
  const mediaCount = Number(params.get('NumMedia') || 0);
  const imageBlocks = [];
  if (mediaCount > 0) {
    const block = await fetchImageBlock(params.get('MediaUrl0'), env);
    if (block) imageBlocks.push(block);
  }

  if (!bodyText && !imageBlocks.length) {
    return reply(mediaCount > 0
      ? (lang === 'ar'
        ? 'وصلني مرفق لا أستطيع فتحه. هل يمكنك كتابة سؤالك نصًا؟'
        : 'An attachment came through that I cannot open. Could you type your question instead?')
      : greeting(lang));
  }

  const content = imageBlocks.length
    ? [...imageBlocks, { type: 'text', text: bodyText || (lang === 'ar' ? 'ما هذا؟' : 'What is this?') }]
    : bodyText;

  const history = await loadMemory(env, from);
  const { messages } = sanitizeMessages([...history, { role: 'user', content }]);
  if (!messages.length) return reply(greeting(lang));

  const groundingPages = await retrieveRelevantPages(request, lang, bodyText);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WA_UPSTREAM_TIMEOUT);

  let answer = '';
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: WA_MAX_TOKENS,
        system: buildSystemPrompt(lang, null, null, groundingPages, 'whatsapp'),
        messages,
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      let detail = '';
      try { detail = await upstream.text(); } catch {}
      console.error('Anthropic API error (whatsapp)', upstream.status, detail);
      return reply(unavailable(lang));
    }

    const data = await upstream.json();
    answer = (Array.isArray(data.content) ? data.content : [])
      .filter((b) => b && b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch (err) {
    console.error('WhatsApp upstream failure', err && err.name === 'AbortError' ? 'timeout' : err);
    return reply(lang === 'ar'
      ? 'استغرق الرد وقتًا أطول من المتوقع. أعد إرسال سؤالك من فضلك.'
      : 'That took longer than expected. Please send your question again.');
  } finally {
    clearTimeout(timer);
  }

  // The marker is stripped before anything is sent — the sender only
  // ever sees the sentence the assistant wrote for them.
  const { reply: visible, escalation } = splitEscalation(answer);
  answer = visible;

  if (!answer) return reply(unavailable(lang));

  if (escalation) {
    // The sender's WhatsApp number is the contact whether or not the
    // model repeated it, so prefer the real one over anything typed.
    const task = recordEscalation(env, {
      channel: 'whatsapp',
      topic: escalation.topic,
      summary: escalation.summary,
      contact: from.replace(/^whatsapp:/, '') || escalation.contact,
      lang,
      transcript: transcriptFrom([...messages, { role: 'assistant', content: answer }]),
    }).catch((err) => console.error('escalation failed', err));
    // Twilio is waiting on this response; hand the work to the runtime
    // rather than making the sender wait for a database round trip.
    if (context.waitUntil) context.waitUntil(task); else await task;
  }

  await saveMemory(env, from, [
    ...history,
    // Images are not kept in memory — only their accompanying text — so a
    // stored thread stays small and well under KV's value limit.
    { role: 'user', content: bodyText || '[sent an image]' },
    { role: 'assistant', content: answer },
  ]);

  return reply(answer);
}

// Twilio only ever POSTs. A browser hitting this URL should get a plain,
// honest answer rather than a stack trace or a blank 405 page.
export async function onRequestGet() {
  return new Response(
    'Sultan Hanafi Royal Schools — WhatsApp assistant webhook. This endpoint accepts POST requests from Twilio only.',
    { status: 405, headers: { 'content-type': 'text/plain; charset=utf-8', allow: 'POST' } },
  );
}
