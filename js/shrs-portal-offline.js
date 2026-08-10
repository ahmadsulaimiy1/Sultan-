/* Sultan Hanafi Royal Schools — the bridge between the portal pages that
 * already exist and the offline data layer.
 *
 * WHY A BRIDGE AND NOT A REWRITE. Every portal dashboard in this codebase is a
 * classic script — an IIFE, `var`, no imports — loaded with `defer`. The
 * offline layer is ES modules. Rewriting eleven working dashboards to reach it
 * would be a large change to code that is presently correct, and the directive
 * is explicit that existing architecture is to be respected rather than
 * remodelled. So this module publishes one small global, and each dashboard
 * changes by about four lines: instead of `fetch(url)` it calls `view(...)`
 * and is told, in the same breath, where the answer came from.
 *
 * IF THIS FILE FAILS TO LOAD, nothing breaks. The global is simply absent and
 * every dashboard falls through to the plain `fetch` it did before. That is
 * the whole reason the shape is `window.X ? use it : fetch()` at each call
 * site rather than a hard dependency.
 *
 * WHAT IS NOT DECIDED HERE. Not one field. `shrs-offline-policy.js` says what
 * a view may keep; this file only carries it. A dashboard cannot widen its own
 * cache by asking differently, because the redaction happens on write, inside
 * the store, on the way to the disk.
 */
import * as store from './shrs-local-store.js';
import { PORTAL_VIEWS, redactViewForCache } from './shrs-offline-policy.js';
import { SOURCE, freshnessLabel } from './shrs-data-layer.js';

const listeners = new Map();          // view → Set<fn>

/* ── Opening the session ─────────────────────────────────────────────────
 *
 * THE ONE THING THIS CANNOT DO FOR ITSELF. The device store encrypts every
 * record under a key derived from a session secret that is never persisted
 * (shrs-offline-policy.js §7: keyPersisted: false). Until something calls
 * `openSession` with that material, `sessionValid()` is false, nothing is
 * written to the device, and every call below behaves exactly as the portal
 * behaved before this file existed: live or nothing. That is fail-closed by
 * construction, not by a check that could be forgotten.
 *
 * WHAT IS MISSING, PRECISELY. The server does not yet issue per-session
 * offline key material, and the client cannot invent it: a key the browser
 * generates and stores is not a key, it is obfuscation, and the policy refuses
 * it. Issuing it is a security decision with a real trade-off attached —
 *
 *   · Material returned in the `me` response only, held in memory, dies on
 *     reload. Safe, and makes a cold offline start impossible, which would
 *     reduce LIFETIMES.offlineSessionMs to the lifetime of one page.
 *   · Material in a script-readable cookie, Secure, SameSite=Strict, expiring
 *     with the offline session. Survives a reload — which is the whole point
 *     of a twelve-hour window — at the cost that script running on the page
 *     can read it. That is already true of anything the page can decrypt, but
 *     it widens the blast radius of an XSS from "this tab" to "the cache".
 *
 * That choice belongs to the Founder, not to this file, so nothing here
 * presumes it. The client half is complete and waiting for the call.
 */
export async function openSession(keyMaterial) {
  if (!keyMaterial) return false;
  // The salt need not be secret — it exists so two devices under one account
  // do not derive the same key. deviceId() already persists one.
  const salt = await store.deviceId();
  await store.unlock(keyMaterial, salt);
  return store.sessionValid();
}

/** Drops the key and purges. Called on logout; also the honest response to a
 *  401, which means the session this cache belonged to is over. */
export async function closeSession(reason = 'logout') {
  store.lock();
  await store.purgeAll(reason).catch(() => {});
}

function envelope(view, data, source, syncedAt) {
  return {
    view, data, source, syncedAt: syncedAt || null,
    isLive: source === SOURCE.NETWORK,
    ageMs: syncedAt ? Date.now() - syncedAt : null,
  };
}

/**
 * Fetch a dashboard, answering from the device when the device is all there
 * is. Returns the same shape in every case, so a caller never has to ask
 * whether it is holding a response or a record:
 *
 *   { ok, status, data, source, syncedAt, isLive, error }
 *
 * `status` is the HTTP status when there was one and 0 when there was not, so
 * the existing `if (res.status === 401) redirect` checks keep working
 * unchanged — and, importantly, a cached answer never reports 200. A 401 is a
 * fact about the server, and the device has no standing to invent one.
 */
export async function view(name, url, options = {}) {
  const id = options.id || 'self';
  const known = Boolean(PORTAL_VIEWS[name]);

  if (navigator.onLine !== false) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && known) {
        // Written redacted. What the screen shows and what the disk holds are
        // deliberately not the same thing: the screen has the live answer, the
        // disk has only the part policy allows to survive the session.
        await store.putRecord(name, id, body, { syncedAt: Date.now(), syncState: 'synced' })
          .catch(() => {});
      }
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        // Authorisation is gone. Anything held under it goes with it, now,
        // rather than at the next sweep.
        await store.deleteRecord(name, id).catch(() => {});
      }
      return {
        ok: res.ok, status: res.status, data: body,
        source: SOURCE.NETWORK, syncedAt: Date.now(), isLive: true, error: null,
      };
    } catch (err) {
      // The network said it was there and it was not. Fall through.
    }
  }

  if (!known) {
    return { ok: false, status: 0, data: null, source: SOURCE.UNAVAILABLE, syncedAt: null, isLive: false, error: 'offline' };
  }

  if (!store.sessionValid()) {
    return { ok: false, status: 0, data: null, source: SOURCE.LOCKED, syncedAt: null, isLive: false, error: 'locked' };
  }

  const cached = await store.getRecord(name, id).catch(() => null);
  if (!cached) {
    return { ok: false, status: 0, data: null, source: SOURCE.UNAVAILABLE, syncedAt: null, isLive: false, error: 'offline' };
  }
  return {
    ok: true, status: 0, data: cached.data,
    source: SOURCE.CACHE, syncedAt: cached.syncedAt, isLive: false, error: null,
  };
}

/** What a view is holding, without going near the network. Used by the
 *  connectivity layer to decide whether an offline dashboard has anything to
 *  show before it offers to render one. */
export async function held(name, id = 'self') {
  if (!PORTAL_VIEWS[name] || !store.sessionValid()) return null;
  const row = await store.getRecord(name, id).catch(() => null);
  return row ? envelope(name, row.data, SOURCE.CACHE, row.syncedAt) : null;
}

export function onUpdate(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name).delete(fn);
}

/* ── Saying so on the screen ─────────────────────────────────────────────── */

/**
 * Puts the freshness stamp where the reader is already looking. A dashboard
 * that came off the disk must say so — not in a corner, and not only in a
 * colour, because a colour is not readable to everyone and is not a sentence.
 */
export function stamp(el, result, lang = 'en') {
  if (!el) return;
  const label = freshnessLabel(
    { source: result.source, ageMs: result.syncedAt ? Date.now() - result.syncedAt : null },
    lang,
  );
  el.textContent = label.text;
  el.setAttribute('data-freshness', label.tone);
  el.hidden = label.tone === 'live';        // "Live" needs no announcement
}

/** The sentence shown when there is nothing held and no signal — worded so it
 *  cannot be read as "there is no such record". */
export function unavailableMessage(lang = 'en') {
  const M = {
    en: 'This has not been opened on this device before, so there is no saved copy to show. It will load as soon as there is a connection.',
    ar: 'لم يُفتح هذا على هذا الجهاز من قبل، فلا توجد نسخة محفوظة لعرضها. سيُحمَّل بمجرد توفر الاتصال.',
    yo: 'A kò tíì ṣí èyí lórí ẹ̀rọ yìí rí, nítorí náà kò sí ẹ̀dà tí a fi pamọ́. Yóò ṣí ní kété tí ìsopọ̀ bá wà.',
    fr: 'Ceci n’a jamais été ouvert sur cet appareil, il n’y a donc pas de copie enregistrée à afficher. Le chargement se fera dès qu’une connexion sera disponible.',
  };
  return M[lang] || M.en;
}

/** The sentence shown when the offline session has run out. Distinct from the
 *  one above on purpose: one means "not here yet", the other means "no longer
 *  yours to read". Collapsing them would hide an authorisation failure behind
 *  a loading state. */
export function lockedMessage(lang = 'en') {
  const M = {
    en: 'Your offline session has expired. Reconnect and sign in again to see this.',
    ar: 'انتهت جلستك دون اتصال. أعد الاتصال وسجّل الدخول مرة أخرى لعرض هذا.',
    yo: 'Àkókò ìṣiṣẹ́ rẹ láìsí ìsopọ̀ ti parí. Sopọ̀ padà kí o sì wọlé lẹ́ẹ̀kan sí i láti rí èyí.',
    fr: 'Votre session hors ligne a expiré. Reconnectez-vous pour consulter ceci.',
  };
  return M[lang] || M.en;
}

/* ── The global the classic scripts reach for ────────────────────────────── */

if (typeof window !== 'undefined') {
  window.SHRSPortalOffline = {
    view, held, onUpdate, stamp, unavailableMessage, lockedMessage,
    openSession, closeSession, SOURCE,
    // Exposed so a page can show what it would be caching without reading the
    // policy module itself. Used by the test, and by anyone auditing a device.
    redact: redactViewForCache,
    views: Object.keys(PORTAL_VIEWS),
  };
}
