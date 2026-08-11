// Cloudflare Pages Function — proxies the Digital Academic Assistant to
// the Anthropic Messages API with streaming. Ported from the Vercel Edge
// Function (api/chat.js); logic is identical, only the handler signature
// and env-var access changed (Workers get env vars via context.env, not
// process.env). Requires an ANTHROPIC_API_KEY environment variable set
// in the Cloudflare Pages project (Settings -> Environment variables).
// Without it, this function returns a clear 500 rather than silently
// failing. See docs/digital-assistant.md for setup steps.
//
// Wire format: POST { messages: [{role, content}], lang: 'en'|'ar' }
// Response: a plain-text stream of the assistant's reply (UTF-8 chunks),
// or a JSON { error } body on failure (before streaming starts).

import {
  DEFAULT_MODEL,
  MAX_TOKENS,
  MAX_TOTAL_CHARS,
  OFFICE_PROFILES,
  STYLE_PROFILES,
  buildSystemPrompt,
  jsonError,
  retrieveRelevantPages,
  sanitizeMessages,
} from '../_lib/assistant.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError('The assistant is not configured yet — an administrator needs to add ANTHROPIC_API_KEY to this deployment.', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid request body.', 400);
  }

  const lang = body.lang === 'ar' ? 'ar' : 'en';
  const office = typeof body.office === 'string' && OFFICE_PROFILES[body.office] ? body.office : null;
  const style = typeof body.style === 'string' && STYLE_PROFILES[body.style] ? body.style : null;
  const { messages, totalChars } = sanitizeMessages(body.messages);

  if (!messages.length) return jsonError('No message provided.', 400);
  if (totalChars > MAX_TOTAL_CHARS) {
    return jsonError('This conversation has gotten long — please start a new chat so we can keep things fast and accurate.', 413);
  }
  if (messages[messages.length - 1].role !== 'user') {
    return jsonError('The last message must be from the user.', 400);
  }

  const lastContent = messages[messages.length - 1].content;
  const lastMessageText = typeof lastContent === 'string'
    ? lastContent
    : Array.isArray(lastContent)
      ? lastContent.filter((b) => b && b.type === 'text').map((b) => b.text).join(' ')
      : '';
  const groundingPages = await retrieveRelevantPages(request, lang, lastMessageText);

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
        system: buildSystemPrompt(lang, office, style, groundingPages),
        messages,
        stream: true,
      }),
      signal: request.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') return new Response(null, { status: 499 });
    return jsonError('Could not reach the assistant service. Please try again shortly.', 502);
  }

  if (!upstream.ok || !upstream.body) {
    let detail = '';
    try { detail = await upstream.text(); } catch {}
    console.error('Anthropic API error', upstream.status, detail);
    return jsonError('The assistant is temporarily unavailable. Please try again shortly.', 502);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;
            let evt;
            try { evt = JSON.parse(data); } catch { continue; }
            if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(evt.delta.text));
            } else if (evt.type === 'error') {
              controller.enqueue(encoder.encode(`\n[assistant error: ${evt.error && evt.error.message ? evt.error.message : 'stream error'}]`));
            }
          }
        }
      } catch (err) {
        // client cancelled or upstream dropped — just end the stream
      } finally {
        try { controller.close(); } catch {}
      }
    },
    cancel() {
      try { upstream.body.cancel(); } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
