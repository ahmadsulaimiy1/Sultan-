# PWA Push Notifications

**The last unbuilt piece of the App Architecture Directive**, after the
web manifest, service worker, install prompts (PWA core) and the
Capacitor Android build. This document records what shipped, what it
reuses, and what stays honestly deferred.

## What this is

A signed-in guardian can turn on push notifications for their browser
or installed app, on any device, and receive a real OS-level
notification — even when the site isn't open — the moment staff
publish an announcement they're subscribed to. No third-party push
provider, no paid SaaS: it's RFC 8030/8291/8292 Web Push, implemented
directly against the browser's native Push API and a self-hosted VAPID
key pair.

## What already existed (not rebuilt)

- **`guardian_notification_preferences`** (built for the Personalisation
  Centre's Notifications tab) already modelled four delivery channels —
  website (live), email/WhatsApp/SMS (marked "coming soon" because no
  provider existed for them). Push slots into this as a fifth channel,
  `channel_push`, without changing that tab's shape.
- **`sw.js`** (the PWA service worker) already existed with install/
  activate/fetch handling — this only adds `push` and
  `notificationclick` listeners to it.
- **`functions/api/portal/admin/announcements.js`**'s publish action —
  the exact trigger point the original directive named ("push
  notifications for announcements/news/portal notifications"). Nothing
  about its create/update/archive/feature lifecycle changed.
- **`functions/_lib/email.js`**'s pattern — env-var-gated, never-throw,
  `{sent, reason}` — reused as the shape for
  `functions/_lib/web-push.js`'s send functions, and
  `siteOriginFromRequest()` is reused directly (Preview and Production
  are separate Cloudflare Pages environments with separate databases;
  an announcement's action link must resolve against whichever one
  published it).

## What's new

- **Schema**: `push_subscriptions` (one row per subscribed browser/
  device — `endpoint` is globally unique and is the natural key, not
  `guardian_id`, since one family signed in on a phone and a laptop
  holds two independent subscriptions) and
  `guardian_notification_preferences.channel_push BOOLEAN`.
- **`functions/_lib/web-push.js`**: hand-implemented VAPID (RFC 8292:
  an ES256-signed JWT authenticating this server to the push service)
  and aes128gcm message encryption (RFC 8291/8188: ECDH + HKDF + AES-
  128-GCM, single-record). Built on `node:crypto` (already required
  sitewide via the `nodejs_compat` compatibility flag for
  `session.js`), deliberately not the `web-push` npm package — that
  library shells out to Node's `https` client for the send, which
  isn't a dependable primitive inside the Cloudflare Workers runtime,
  whereas the `fetch()` used here always is. Every send function
  matches `email.js`'s contract: never throws, returns
  `{sent: false, reason: 'not_configured'}` when no VAPID keys are set.
- **`scripts/generate-vapid-keys.js`**: one-time local key-pair
  generator. Run once, paste the three printed values into Cloudflare
  Pages env vars (Preview and Production separately, same as
  `RESEND_API_KEY`).
- **`functions/api/portal/push-public-key.js`**: public GET, no
  session — a VAPID public key isn't a secret, it's exactly the
  `applicationServerKey` a browser needs for
  `pushManager.subscribe()`. Returns `null` when the school hasn't
  generated real keys yet, so the frontend hides the toggle instead of
  offering a subscribe button that would fail.
- **`functions/api/portal/push-subscribe.js`**: session-authenticated
  POST (upsert by endpoint) and DELETE (remove + auto-clear
  `channel_push` once no subscriptions remain for that guardian).
- **`notifyGuardiansOfPublish()`** in `admin/announcements.js`: on
  `publish`, fans out to every guardian with `channel_push = true AND
  type_announcements = true`, reusing the exact same
  `guardian_notification_preferences` row the Notifications tab
  already writes. Best-effort and fully wrapped — a slow or failing
  push provider can never block or fail the publish action itself.
- **`sw.js`**: `push` (renders the decrypted JSON payload as a native
  notification) and `notificationclick` (focuses an already-open tab on
  the target URL if one exists, else opens a new one) listeners.
- **Personalisation Centre** (`js/personalisation.js`, Notifications
  tab): a real "Push Notifications (this device)" toggle, distinct
  from the other four channel switches — those are just stored
  booleans, this one performs an actual `Notification.requestPermission`
  + `pushManager.subscribe()`/`unsubscribe()` round-trip against the
  new backend endpoints, and only renders at all when the browser
  supports the Push API.

## Verified without a live deployment

No real VAPID keys exist in this sandbox (no live Cloudflare project
to configure), so the encryption/signing path was verified against
itself rather than a real push service: a script generated a VAPID key
pair and a simulated subscriber key pair, called `sendWebPush()` with
`fetch` intercepted, then — playing the role of the push service and
the receiving browser — verified the VAPID JWT's ES256 signature and
decrypted the aes128gcm body back to the exact original JSON payload.
Both checks passed. The Playwright-driven Personalisation Centre check
confirmed the Notifications tab renders the new toggle and the panel
never throws when the Push API is present but no session/backend
exists (the toggle simply reflects "not subscribed").

## What's still deferred

- **Email/WhatsApp/SMS channels** — unchanged from before this work;
  still "coming soon," still needing a provider decision
  (`docs/digital-campus-roadmap.md`).
- **Push for events other than announcement publish** — results,
  attendance, fees, messages, emergency alerts all have
  `guardian_notification_preferences` type flags already, but only
  the announcements publish flow calls `sendWebPushToGuardian()` today.
  Wiring the others in is mechanical (each already has its own admin
  write endpoint) but intentionally out of scope here — the directive
  named announcements/news specifically.
- **Real VAPID keys on a live deployment** — an admin must run
  `scripts/generate-vapid-keys.js` and set the three env vars on both
  Cloudflare Pages environments before any of this sends a real push.
