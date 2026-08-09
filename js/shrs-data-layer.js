/* SHRS DATA LAYER — read-through cache with honest freshness.
 *
 * Phase 2 of the offline-first directive. This is the module that turns
 *
 *     CLICK → WAIT → SPINNER → REQUEST → PAGE
 * into
 *     CLICK → PAGE (from the device) → quiet refresh → silent update
 *
 * and it does it by actually having the data, not by covering the wait with an
 * animation. The directive is explicit about that distinction and it is the
 * whole design: `read()` resolves from IndexedDB in a few milliseconds when the
 * record is there, and the network request happens afterwards, in the
 * background, without blocking anything the user can see.
 *
 * THE RULE THIS MODULE MUST NOT BREAK. Cached data is never presented as live
 * data. Every result carries where it came from and when it was last
 * synchronised, and the UI is obliged to say so. A Registrar looking at a
 * student record must be able to tell, without asking, whether they are seeing
 * the register or a photograph of the register.
 *
 * PUBLIC CONTENT DOES NOT COME THROUGH HERE. Policies, handbooks, announcements
 * and admissions pages stay network-first, per the Founder's standing rule that
 * a newly published policy must never be served stale. This layer is for
 * authorised portal records only.
 */
import {
  getRecord, putRecord, sessionValid, sessionExpiresAt,
} from './shrs-local-store.js';
import { SYNC } from './shrs-offline-policy.js';

/* Where a result came from. The UI branches on this, so the names are part of
 * the contract rather than an implementation detail. */
export const SOURCE = {
  CACHE: 'cache',          // from the device; carries syncedAt
  NETWORK: 'network',      // straight from the server; authoritative
  UNAVAILABLE: 'unavailable', // not cached, and no network — say so plainly
  LOCKED: 'locked',        // offline session expired; reconnect required
};

const listeners = new Set();
/** Subscribe to background refreshes. Called with the same envelope `read`
 *  returns, so a view can render once and then simply re-render on update. */
export function onUpdate(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(envelope) { for (const fn of listeners) { try { fn(envelope); } catch { /* a bad listener must not break sync */ } } }

/* In-flight de-duplication. Three cards asking for the same student on one
 * screen is one request, not three. */
const inFlight = new Map();

function envelope(entity, id, data, source, syncedAt) {
  return {
    entity, id, data, source, syncedAt: syncedAt || null,
    // The two questions a view actually needs answered.
    isLive: source === SOURCE.NETWORK,
    ageMs: syncedAt ? Date.now() - syncedAt : null,
  };
}

/**
 * The core call. Returns immediately from the device when it can, and refreshes
 * behind the user's back.
 *
 * @param {string} entity     'student' | 'certificate' | …
 * @param {string} id
 * @param {() => Promise<object>} fetcher  performs the real network read
 * @param {{ revalidate?: boolean, forceNetwork?: boolean }} [opts]
 */
export async function read(entity, id, fetcher, opts = {}) {
  const { revalidate = true, forceNetwork = false } = opts;

  if (!sessionValid()) {
    // Fail closed. The offline session has expired, so cached records are not
    // merely stale — they are no longer ours to show.
    return envelope(entity, id, null, SOURCE.LOCKED, null);
  }

  const cached = forceNetwork ? null : await getRecord(entity, id);

  if (cached) {
    // Hand the caller the record NOW. Everything after this line happens after
    // the view has already painted.
    if (revalidate && navigator.onLine) {
      refreshInBackground(entity, id, fetcher);
    }
    return envelope(entity, id, cached.data, SOURCE.CACHE, cached.syncedAt);
  }

  // Nothing local. This is the one case that genuinely has to wait, and the
  // directive accepts it: a first-time lookup of a record never seen before.
  if (!navigator.onLine) {
    return envelope(entity, id, null, SOURCE.UNAVAILABLE, null);
  }
  try {
    const fresh = await dedupe(entity, id, fetcher);
    await putRecord(entity, id, fresh, { syncedAt: Date.now(), syncState: 'synced' });
    return envelope(entity, id, fresh, SOURCE.NETWORK, Date.now());
  } catch {
    return envelope(entity, id, null, SOURCE.UNAVAILABLE, null);
  }
}

function dedupe(entity, id, fetcher) {
  const key = `${entity}:${id}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const p = Promise.resolve()
    .then(fetcher)
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/**
 * The quiet half. Fetches, stores, and tells anyone listening — but only if
 * something actually changed, so a view does not flicker on every heartbeat.
 */
async function refreshInBackground(entity, id, fetcher) {
  try {
    const fresh = await dedupe(entity, id, fetcher);
    const before = await getRecord(entity, id);
    await putRecord(entity, id, fresh, { syncedAt: Date.now(), syncState: 'synced' });
    const after = await getRecord(entity, id);
    if (!after) return;
    const changed = !before || JSON.stringify(before.data) !== JSON.stringify(after.data);
    if (changed) emit(envelope(entity, id, after.data, SOURCE.NETWORK, after.syncedAt));
  } catch {
    // A failed background refresh is not an error the user needs to see. What
    // they already have is still what they already had, and the freshness
    // stamp keeps telling the truth about its age.
  }
}

/* ── Prefetch on intent ──────────────────────────────────────────────────── */

/* The cheapest instant-response trick that is not a trick: start fetching when
 * the user reveals they are about to click — hover on a pointer device, the
 * first touch on a phone — so the record is on the device before the click
 * lands. Rate-limited, because intent is not certainty and a user sweeping the
 * mouse across a list must not fire twenty requests. */
const prefetched = new Map();
const PREFETCH_TTL = 30_000;

export function prefetch(entity, id, fetcher) {
  const key = `${entity}:${id}`;
  const last = prefetched.get(key) || 0;
  if (Date.now() - last < PREFETCH_TTL) return;
  if (!navigator.onLine || !sessionValid()) return;
  prefetched.set(key, Date.now());
  read(entity, id, fetcher, { revalidate: false }).catch(() => {});
}

/**
 * Wires prefetch-on-intent to a container of links. `resolve` maps an element
 * to {entity, id, fetcher} or null.
 */
export function bindPrefetch(container, resolve) {
  const fire = (event) => {
    const el = event.target.closest?.('[data-prefetch]');
    if (!el) return;
    const spec = resolve(el);
    if (spec) prefetch(spec.entity, spec.id, spec.fetcher);
  };
  container.addEventListener('pointerenter', fire, { capture: true, passive: true });
  container.addEventListener('touchstart', fire, { capture: true, passive: true });
  container.addEventListener('focusin', fire, { capture: true, passive: true });
  return () => {
    container.removeEventListener('pointerenter', fire, { capture: true });
    container.removeEventListener('touchstart', fire, { capture: true });
    container.removeEventListener('focusin', fire, { capture: true });
  };
}

/* ── Freshness, said out loud ────────────────────────────────────────────── */

/**
 * The words a view puts next to cached data. Deliberately plain, and
 * deliberately never reassuring about data it cannot vouch for.
 */
export function freshnessLabel(env, lang = 'en') {
  // All four languages the estate speaks. A freshness stamp is the one label a
  // reader must never have to guess at, so it is not left to fall back to
  // English on a Yoruba or French page.
  const PACKS = {
    en: {
      live: 'Live', synced: 'Last synchronised', unavailable: 'Not available offline',
      locked: 'Offline session expired — reconnect to continue',
      justNow: 'moments ago', min: 'min', hour: 'h', day: 'd',
    },
    ar: {
      live: 'مباشر', synced: 'آخر مزامنة', unavailable: 'غير متاح دون اتصال',
      locked: 'انتهت الجلسة دون اتصال — يرجى إعادة الاتصال',
      justNow: 'قبل لحظات', min: 'دقيقة', hour: 'ساعة', day: 'يوم',
    },
    yo: {
      live: 'Tààrà', synced: 'Ìmúbáramu tí ó kẹ́yìn', unavailable: 'Kò sí láìsí ìsopọ̀',
      locked: 'Àkókò ìṣiṣẹ́ láìsí ìsopọ̀ ti pari — sopọ̀ padà láti tẹ̀síwájú',
      justNow: 'ní ìṣẹ́jú díẹ̀ sẹ́yìn', min: 'ìṣ', hour: 'wk', day: 'ọj',
    },
    fr: {
      live: 'En direct', synced: 'Dernière synchronisation', unavailable: 'Indisponible hors ligne',
      locked: 'Session hors ligne expirée — reconnectez-vous pour continuer',
      justNow: 'à l’instant', min: 'min', hour: 'h', day: 'j',
    },
  };
  const t = PACKS[lang] || PACKS.en;

  if (env.source === SOURCE.LOCKED) return { tone: 'locked', text: t.locked };
  if (env.source === SOURCE.UNAVAILABLE) return { tone: 'unavailable', text: t.unavailable };
  if (env.source === SOURCE.NETWORK) return { tone: 'live', text: t.live };

  const age = env.ageMs || 0;
  let ago;
  if (age < 60_000) ago = t.justNow;
  else if (age < 3_600_000) ago = `${Math.floor(age / 60_000)} ${t.min}`;
  else if (age < 86_400_000) ago = `${Math.floor(age / 3_600_000)} ${t.hour}`;
  else ago = `${Math.floor(age / 86_400_000)} ${t.day}`;
  return { tone: 'cached', text: `${t.synced}: ${ago}` };
}

/* ── Connectivity state, for the §15 indicator ───────────────────────────── */

export function connectivityState({ syncing = false, pendingOps = 0 } = {}) {
  if (!sessionValid()) return { state: 'locked', colour: 'red' };
  if (!navigator.onLine) return { state: 'offline', colour: 'blue' };
  if (syncing) return { state: 'syncing', colour: 'amber' };
  if (pendingOps > 0) return { state: 'sync-required', colour: 'amber' };
  return { state: 'synced', colour: 'green' };
}

/** Milliseconds until the offline session locks. The UI warns near the end
 *  rather than dropping a Registrar mid-task without notice. */
export function msUntilLock() {
  const at = sessionExpiresAt();
  return at ? Math.max(0, at - Date.now()) : 0;
}

export const CADENCE = SYNC;
