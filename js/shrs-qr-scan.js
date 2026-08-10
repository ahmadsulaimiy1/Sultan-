/* Sultan Hanafi Royal Schools — scanning a certificate's QR code.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not verify anything itself. It turns a photograph into a reference,
 * and then hands that reference to whichever checker is honest in the current
 * conditions:
 *
 *   ONLINE   the live endpoint, which compares the content hash and can
 *            legitimately answer "Genuine".
 *   OFFLINE  js/shrs-certificate-offline.js, which cannot return `genuine`
 *            on any path and says "recorded as issued" at its strongest.
 *
 * A scan therefore never becomes a stronger claim than the connection
 * supports. That is structural: this file has no verdict of its own to give.
 *
 * WHAT LEAVES THE DEVICE: nothing. Frames are read from a live <video> into
 * an in-memory decode and discarded. No image is stored, cached, uploaded, or
 * written to IndexedDB. The camera stream is stopped the moment a code is
 * read or the scanner is closed — not left running behind a hidden element.
 *
 * DECODING is done by the browser's own BarcodeDetector. No third-party
 * decoder is shipped: a QR library is a large dependency in the trust path of
 * a document-verification flow, and where the platform cannot decode, this
 * says so and offers the keyboard rather than pretending to try.
 */
import * as offlineCheck from './shrs-certificate-offline.js';

export const OUTCOME = {
  RESOLVED: 'resolved',                 // a reference was recovered from the code
  NOT_OURS: 'not-ours',                 // a valid QR code, but not this school's
  UNREADABLE: 'unreadable',             // decoded to something with no reference in it
  NO_DECODER: 'no-decoder',             // the browser cannot decode QR codes
  NO_CAMERA: 'no-camera',               // no camera, or permission refused
  CANCELLED: 'cancelled',
};

/* ── Reading the payload ─────────────────────────────────────────────────── */

// Only this school's own address, or a bare reference. A QR code is an
// attacker-supplied string: one pointing at another origin with ?ref= in it
// must not be treated as ours and quietly looked up as though it were. The
// host check is the whole defence, so it is exact-match, not "contains".
const OUR_HOSTS = ['shroyalschools.com', 'www.shroyalschools.com'];

// Matches the shapes the live verifier already accepts, so a code that works
// online works offline. Deliberately narrow: a serial, a student ID, or a
// verification code — not "any string that looks vaguely like an identifier".
const BARE_REFERENCE = /^[A-Z0-9][A-Z0-9-]{5,63}$/i;

export function referenceFrom(payload, options = {}) {
  const raw = String(payload == null ? '' : payload).trim();
  if (!raw) return { outcome: OUTCOME.UNREADABLE, payload: raw };

  if (/^https?:\/\//i.test(raw)) {
    let url;
    try { url = new URL(raw); } catch (e) { return { outcome: OUTCOME.UNREADABLE, payload: raw }; }

    const hosts = options.allowedHosts || OUR_HOSTS;
    const sameAsThisPage = typeof location !== 'undefined' && url.host === location.host;
    if (!hosts.includes(url.hostname) && !sameAsThisPage) {
      return { outcome: OUTCOME.NOT_OURS, payload: raw, host: url.hostname };
    }

    const ref = url.searchParams.get('ref');
    if (ref && BARE_REFERENCE.test(ref.trim())) {
      return { outcome: OUTCOME.RESOLVED, reference: ref.trim(), from: 'url' };
    }
    // /verify-certificate/SHRS-CERT-… — the path form.
    const tail = url.pathname.split('/').filter(Boolean).pop() || '';
    if (BARE_REFERENCE.test(tail)) {
      return { outcome: OUTCOME.RESOLVED, reference: tail, from: 'path' };
    }
    return { outcome: OUTCOME.UNREADABLE, payload: raw };
  }

  if (BARE_REFERENCE.test(raw)) return { outcome: OUTCOME.RESOLVED, reference: raw, from: 'bare' };
  return { outcome: OUTCOME.UNREADABLE, payload: raw };
}

/* ── Deciding who checks it ──────────────────────────────────────────────── */

/**
 * Takes a decoded payload and returns what can honestly be said about it.
 *
 * `online` is passed in rather than read from navigator here, so the caller —
 * and the test — can be explicit about which path is being exercised. It
 * defaults to the browser's own answer.
 */
export async function resolveScan(payload, options = {}) {
  const read = referenceFrom(payload, options);
  if (read.outcome !== OUTCOME.RESOLVED) return { ...read, genuine: false, mode: 'none' };

  const online = options.online === undefined
    ? (typeof navigator !== 'undefined' && navigator.onLine)
    : Boolean(options.online);

  if (!online) {
    // The offline module is the only thing that answers here, and it cannot
    // say "genuine". No branch in this file can override that.
    const result = await offlineCheck.check(read.reference, options);
    return {
      outcome: OUTCOME.RESOLVED,
      reference: read.reference,
      mode: 'offline',
      genuine: false,
      offline: result,
      description: offlineCheck.describe(result, options.lang || 'en'),
    };
  }

  return {
    outcome: OUTCOME.RESOLVED,
    reference: read.reference,
    mode: 'online',
    // Not a verdict — an instruction. The live endpoint decides, and only the
    // live endpoint may return a positive one.
    verifyUrl: '/api/certificates/verify?ref=' + encodeURIComponent(read.reference),
    pageUrl: '/verify-certificate/?ref=' + encodeURIComponent(read.reference),
    genuine: false,
  };
}

/* ── The camera ──────────────────────────────────────────────────────────── */

export function decoderAvailable() {
  return typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function';
}

export function cameraAvailable() {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Opens the camera, watches for a QR code, and resolves with the first one it
 * reads. The stream is stopped in a finally, so a thrown decoder, a cancelled
 * scan and a successful read all leave the camera off.
 */
export async function scan(videoEl, options = {}) {
  if (!decoderAvailable()) return { outcome: OUTCOME.NO_DECODER, genuine: false };
  if (!cameraAvailable()) return { outcome: OUTCOME.NO_CAMERA, genuine: false, reason: 'unsupported' };

  let stream = null;
  const stop = () => {
    if (stream) stream.getTracks().forEach((t) => { try { t.stop(); } catch (e) { /* already stopped */ } });
    stream = null;
    if (videoEl) { try { videoEl.srcObject = null; } catch (e) { /* detached */ } }
  };

  try {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (e) {
      return { outcome: OUTCOME.NO_CAMERA, genuine: false, reason: (e && e.name) || 'denied' };
    }

    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline', '');
    videoEl.muted = true;
    await videoEl.play().catch(() => {});

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const deadline = Date.now() + (options.timeoutMs || 60000);

    while (Date.now() < deadline) {
      if (options.signal && options.signal.aborted) return { outcome: OUTCOME.CANCELLED, genuine: false };
      let codes = [];
      try {
        codes = await detector.detect(videoEl);
      } catch (e) {
        codes = [];                     // a frame that could not be read is not a failure
      }
      if (codes && codes.length) {
        // Nothing about the frame is kept — only the string it contained.
        return await resolveScan(codes[0].rawValue, options);
      }
      await new Promise((r) => setTimeout(r, options.intervalMs || 180));
    }
    return { outcome: OUTCOME.CANCELLED, genuine: false, reason: 'timeout' };
  } finally {
    stop();
  }
}

/* ── Words ───────────────────────────────────────────────────────────────── */

const WORDS = {
  en: {
    notOurs: 'This code does not belong to Sultan Hanafi Royal Schools',
    notOursNote: 'It points to {host}. Nothing has been checked against it.',
    unreadable: 'That code was read, but it holds no certificate reference',
    unreadableNote: 'Try the serial number printed on the certificate instead.',
    noDecoder: 'This browser cannot read QR codes',
    noDecoderNote: 'Type the serial number printed on the certificate instead — it gives exactly the same result.',
    noCamera: 'No camera is available',
    noCameraNote: 'Allow camera access, or type the serial number printed on the certificate.',
    online: 'Checking with the school',
    offline: 'Checked against the register held on this device',
  },
  ar: {
    notOurs: 'هذا الرمز لا يخص مدارس السلطان حنفي الملكية',
    notOursNote: 'يشير إلى {host}. لم يتم التحقق من أي شيء بناءً عليه.',
    unreadable: 'تمت قراءة الرمز، لكنه لا يحتوي على رقم شهادة',
    unreadableNote: 'جرّب الرقم التسلسلي المطبوع على الشهادة بدلاً من ذلك.',
    noDecoder: 'هذا المتصفح لا يستطيع قراءة رموز QR',
    noDecoderNote: 'اكتب الرقم التسلسلي المطبوع على الشهادة — النتيجة نفسها تمامًا.',
    noCamera: 'لا تتوفر كاميرا',
    noCameraNote: 'اسمح بالوصول إلى الكاميرا، أو اكتب الرقم التسلسلي المطبوع على الشهادة.',
    online: 'يتم التحقق مع المدرسة',
    offline: 'تم التحقق من السجل المحفوظ على هذا الجهاز',
  },
};

export function describeScan(result, lang = 'en') {
  const t = WORDS[lang] || WORDS.en;
  switch (result.outcome) {
    case OUTCOME.NOT_OURS:
      return { tone: 'unknown', title: t.notOurs, note: t.notOursNote.replace('{host}', result.host || '') };
    case OUTCOME.UNREADABLE:
      return { tone: 'unknown', title: t.unreadable, note: t.unreadableNote };
    case OUTCOME.NO_DECODER:
      return { tone: 'unavailable', title: t.noDecoder, note: t.noDecoderNote };
    case OUTCOME.NO_CAMERA:
      return { tone: 'unavailable', title: t.noCamera, note: t.noCameraNote };
    case OUTCOME.RESOLVED:
      if (result.mode === 'offline') return result.description;
      return { tone: 'pending', title: t.online, note: '' };
    default:
      return { tone: 'unknown', title: '', note: '' };
  }
}
