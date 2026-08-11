# Digital Academic Assistant — what it is and how to turn it on

This replaces the earlier scripted decision-tree widget with a real,
Claude-powered chat assistant: free-text conversation, streaming replies,
a Stop/cancel control, voice input and output, and document/image upload.
It is honestly disclosed as an AI on first open — it never claims to be a
staff member or "the registration office."

It now answers on two channels from one brain: the widget on the website,
and the school's WhatsApp number through Twilio. Both are covered below —
the website widget first, WhatsApp under *WhatsApp — how to turn it on*.

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
     override the default (`claude-sonnet-5`)
3. **Redeploy.** Environment variable changes only take effect on the next
   deployment — push any commit, or use Cloudflare's "Retry deployment"
   button.

There is no other setup — no database, no separate signup for the widget
itself. `functions/api/chat.js` is a Cloudflare Pages Function, auto-routed
from the `functions/api` directory (make sure the `nodejs_compat`
compatibility flag is enabled — see `parent-portal.md` for the one-time
project setup, which covers this).

**If the assistant is showing "not configured yet" on the live site right
now, this is why, and this is the entire fix.** The code is complete and
deployed; only the key is missing. Nobody can add it on the school's behalf
— an API key is a billing credential, and it must be created by the school
in its own Anthropic account and pasted straight into Cloudflare. It should
never be sent over chat, email, or WhatsApp, and it is deliberately absent
from this repository.

## One brain, two doors

Both channels — the website widget and WhatsApp — import the same module,
`functions/_lib/assistant.js`. It holds the school's fact sheet, the
"never invent what isn't published" rule, the list of things that are
explicitly *not* published, the office and style profiles, and the
retrieval that pulls the three most relevant published pages into each
answer.

This is deliberate. Two hand-written copies of a fact sheet drift apart
within months, and the day they do, a parent on WhatsApp and a parent on
the website get two different answers about the same admission step. With
one module there is exactly one place to correct a fact, and both doors
change together. The only thing the channel changes is the *shape* of the
reply: `buildSystemPrompt(..., 'whatsapp')` adds a short instruction to
keep it under about 80 words, in plain sentences with no markdown, and at
most one link written out in full.

## WhatsApp — how to turn it on

`functions/api/whatsapp.js` receives Twilio's webhook whenever somebody
messages the school's WhatsApp number, and answers with the same assistant.

1. **Create a Twilio account** at [twilio.com](https://www.twilio.com) and
   enable **Messaging → WhatsApp**. To message *any* number rather than
   only pre-approved testers, the school's WhatsApp Business profile has to
   be registered and approved by Meta through Twilio — that is Twilio's and
   Meta's process, it takes a few days, and it cannot be shortcut from
   here. The Twilio **Sandbox for WhatsApp** works immediately and is the
   right way to test everything below before approval comes through.
2. **Point the webhook at this site.** In Twilio, under the WhatsApp sender
   (or the sandbox settings), set *When a message comes in* to:
   `https://shroyalschools.com/api/whatsapp`, method **HTTP POST**.
3. **Add the secrets in Cloudflare Pages** → *Settings* → *Variables and
   Secrets*, all marked **Encrypted**:

   | Name | Required | What it is |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | yes | the same key the website widget uses |
   | `TWILIO_AUTH_TOKEN` | yes | from the Twilio console; used **only** to verify that inbound requests really came from Twilio — it is never sent anywhere |
   | `TWILIO_ACCOUNT_SID` | no | only needed if you want the assistant to be able to open photos people send |
   | `TWILIO_WEBHOOK_URL` | no | the exact URL configured in Twilio, if it differs from what Cloudflare sees |
   | `ANTHROPIC_MODEL` | no | model override, shared with the website |

4. **Redeploy**, then message the number and check you get a reply.

As with the API key: these are the school's own credentials. They go
straight from the Twilio console into Cloudflare. They must not be pasted
into a chat window, and they are not stored in this repository.

### What it does, precisely

- **Every request is verified.** Twilio signs each webhook (HMAC-SHA1 over
  the URL plus the sorted parameters); we recompute it and reject anything
  that does not match with a 403. Verified against Twilio's published
  algorithm with an independent implementation, including the repeated-
  parameter case.
- **It fails closed.** If `TWILIO_AUTH_TOKEN` is not set, the endpoint
  refuses every request with a 503 rather than accepting unverified ones.
  An open webhook is a stranger's remote control over the school's
  Anthropic bill.
- **Replies are short.** WhatsApp is not a web page. The channel rule asks
  for about 80 words, no markdown, one full link at most. A reply longer
  than one WhatsApp message is split at sentence boundaries across at most
  three, and if it still overruns it ends in an ellipsis rather than
  stopping mid-thought as though that were the whole answer.
- **Arabic is detected from the message itself** — Twilio sends no language
  hint — so an Arabic question gets an Arabic answer.
- **Photos** are forwarded to the model when `TWILIO_ACCOUNT_SID` is set
  (one image, up to 1.5 MB). Without it, the assistant says it cannot open
  the attachment instead of pretending it looked.
- **Memory is optional.** If a KV namespace is bound as `ASSISTANT_MEMORY`,
  the last eight turns of each conversation are kept for an hour so
  follow-up questions make sense, and "reset" clears the thread. Nothing is
  bound today, so the assistant currently answers each message on its own —
  which is correct and honest, not broken. Binding KV is a one-line change
  in `wrangler.toml` plus a namespace in the Cloudflare dashboard.
- **Timeouts are handled.** Twilio gives a webhook about fifteen seconds;
  we abort the model call at twelve and reply asking the sender to try
  again, rather than letting Twilio time out silently.

### Why Twilio, and what "something stronger" would mean

Twilio is not the only route to WhatsApp — Meta's Cloud API is the direct
one, and 360dialog, Infobip and Vonage are the other common resellers. The
practical differences are commercial, not technical: all of them are the
same WhatsApp Business Platform underneath, all of them require the same
Meta business verification, and all of them charge per conversation on top
of Meta's own rate. Twilio is chosen here because its signature scheme is
documented and verifiable, its sandbox lets the school test before Meta
approval, and its webhook format is stable.

If the school later prefers Meta's Cloud API directly (slightly cheaper at
volume, one fewer vendor), only the verification and reply formatting
change — the assistant brain, the fact sheet and the retrieval stay exactly
as they are. That is the point of keeping them in one module.

## What it costs

Every message sent through the widget is a real, billed call to Anthropic's
API. There is no fixed monthly cost — you pay per conversation, based on
how much text is exchanged. To keep this bounded even under heavy or
abusive use, the backend enforces:

- a hard cap of 24 trailing messages kept as context per conversation
- a cap of ~4,000 characters per message and ~16,000 characters across a
  whole conversation (longer conversations are rejected with a message
  asking the visitor to start a new chat)
- a reply cap of 1,536 tokens on the website (640 on WhatsApp)
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
published yet, and point to `info@shroyalschools.com` or
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

The WhatsApp endpoint was exercised the same way — 26 assertions against a
stubbed Twilio and a stubbed Anthropic API, all passing: signature accepted
and rejected correctly (valid, forged, absent, wrong token, repeated
parameter, `http`→`https` normalisation, explicit URL override), the
WhatsApp channel rule reaching the prompt, grounding pages injected,
conversation memory replayed and cleared, Arabic routed to Arabic, TwiML
escaped against injection from the model's own output, long replies
segmented and marked, photos forwarded and kept out of stored memory,
unreadable attachments answered honestly, and clean behaviour with no KV
bound and with each secret missing in turn. What that cannot cover is the
Twilio→Meta leg. After the secrets are set, send one real WhatsApp message
and confirm a reply before announcing the number to families.
