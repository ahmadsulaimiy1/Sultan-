# Digital Academic Assistant — what it is and how to turn it on

This replaces the earlier scripted decision-tree widget with a real,
Claude-powered chat assistant: free-text conversation, streaming replies,
a Stop/cancel control, voice input and output, and document/image upload.
It is honestly disclosed as an AI on first open — it never claims to be a
staff member or "the registration office."

## What you need to do before it works

The widget is already built and deployed with the rest of the site, but it
calls a backend function (`functions/api/chat.js`) that proxies to
Anthropic's Claude API. **Without an API key, every message will show a
clear "not configured yet" error** — it will not silently fail or pretend
to work.

1. **Create an Anthropic API key.**
   Go to [console.anthropic.com](https://console.anthropic.com), create or
   sign in to an account, add a payment method, and generate an API key
   under *API Keys*.
2. **Add it to Cloudflare Pages.**
   In your Cloudflare Pages project → *Settings* → *Environment Variables*,
   add:
   - `ANTHROPIC_API_KEY` = the key you just created (mark it as
     **Encrypted**, not plain text)
   - Optionally `ANTHROPIC_MODEL` = a specific model ID, if you want to
     override the default (`claude-sonnet-4-5-20250929`)
3. **Redeploy.** Environment variable changes only take effect on the next
   deployment — push any commit, or use Cloudflare's "Retry deployment"
   button.

There is no other setup — no database, no separate signup for the widget
itself. `functions/api/chat.js` is a Cloudflare Pages Function, auto-routed
from the `functions/api` directory (make sure the `nodejs_compat`
compatibility flag is enabled — see `parent-portal.md` for the one-time
project setup, which covers this).

## What it costs

Every message sent through the widget is a real, billed call to Anthropic's
API. There is no fixed monthly cost — you pay per conversation, based on
how much text is exchanged. To keep this bounded even under heavy or
abusive use, the backend enforces:

- a hard cap of 24 trailing messages kept as context per conversation
- a cap of ~4,000 characters per message and ~16,000 characters across a
  whole conversation (longer conversations are rejected with a message
  asking the visitor to start a new chat)
- a reply cap of 1,024 tokens
- at most 3 image attachments considered per message

These bound the *worst case* cost per conversation, but they do not stop
someone from opening many conversations. If usage grows, the next step
would be real rate limiting (e.g. Cloudflare KV or Upstash Redis, keyed by
IP) — not implemented here because it needs its own paid service and
wasn't part of this build's scope. Keep an eye on usage from the Anthropic
console's billing page, especially in the first weeks after launch.

## What it can and can't say

The backend's system prompt restates the same honesty rule that has
governed every other page: it only states school-specific facts (the four
institutions, admissions steps, boarding terms, governance, contact
details) that are drawn directly from the published site content. Anything
not published — exact tuition fees, the academic calendar, scholarship
criteria, international-admission arrangements — it will say plainly isn't
published yet, and point to `info@shroyalschools.ng` or
`principal@shrschools.ng` instead of guessing. It's free to use its
general knowledge for actual academic help (English writing, homework
explanations, exam prep) since that isn't a claim about the school.

## Voice and document features — real limits, stated plainly

- **Voice input** uses the browser's own Web Speech API. It works well in
  Chrome and Edge; Safari and Firefox support is inconsistent or absent.
  Where unsupported, the mic button shows a plain notice instead of
  failing silently. Transcribed speech lands in the text box for the
  visitor to edit before sending — it is never auto-sent.
- **Voice output** (having replies read aloud) uses the browser's built-in
  text-to-speech (`SpeechSynthesis`), which is free but varies in voice
  quality by device and OS. It's off by default and toggled per session.
  A paid TTS service (e.g. ElevenLabs) would sound better but is a
  separate integration and cost, not included here.
- **Document upload** supports plain text (native), PDF (via pdf.js,
  loaded from a CDN on first use), Word `.docx` (via mammoth.js, same
  pattern), and images (sent directly to Claude's vision input). Extracted
  text is capped at ~6,000 characters per file to keep cost bounded.

## Testing note

This was built and reviewed in a sandbox with no internet egress, so the
live Anthropic API call could not be exercised end-to-end from here. The
UI (streaming render, cancel button, attachment handling, voice toggles)
was verified with a mocked backend response. Once the API key is in place,
send a real message and confirm you see a streamed reply before
considering this fully live.
