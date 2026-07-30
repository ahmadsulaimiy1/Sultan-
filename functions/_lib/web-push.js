// Web Push (RFC 8030/8291/8292) for Cloudflare Pages Functions — the
// browser/OS push channel behind the installable PWA (sw.js). Needs no
// paid provider (unlike email.js's Resend integration): just a VAPID
// key pair the school generates once with scripts/generate-vapid-keys.js
// and stores as VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT env
// vars. Neither is set in this project's sandbox (no real keys have
// been generated for a live deployment), so — same discipline as
// email.js — this is built to be genuinely functional the moment a real
// admin adds real keys, never exercised end-to-end here, and every
// exported send function returns { sent: false, reason: 'not_configured' }
// rather than throwing when the keys are absent.
//
// Uses only node:crypto (already required sitewide via the
// "nodejs_compat" compatibility flag for session.js's HMAC/scrypt) —
// deliberately not the `web-push` npm package, which shells out to
// Node's `https` module for the actual POST; that client is not a
// dependable primitive inside the Workers runtime, whereas `fetch()`
// (used below) always is. The cryptography (VAPID JWT signing +
// aes128gcm message encryption) is hand-implemented against the RFCs
// because that half has no fetch-based shortcut.
import crypto from 'node:crypto';

function base64urlEncode(buf) {
  return Buffer.from(buf).toString('base64url');
}

function base64urlDecode(str) {
  return Buffer.from(str, 'base64url');
}

// A subscription's p256dh/auth (and our stored VAPID public key) travel
// as raw, unpadded base64url — the exact format pushManager.subscribe()
// and the browser's PushSubscription.toJSON() both produce, so no
// reformatting is needed at either the frontend or here.
function uncompressedPointToJwk(rawPoint) {
  if (rawPoint.length !== 65 || rawPoint[0] !== 0x04) {
    throw new Error('Expected a 65-byte uncompressed P-256 point (0x04 prefix).');
  }
  return {
    kty: 'EC', crv: 'P-256',
    x: base64urlEncode(rawPoint.subarray(1, 33)),
    y: base64urlEncode(rawPoint.subarray(33, 65)),
  };
}

function publicKeyObjectToRawPoint(publicKeyObject) {
  const jwk = publicKeyObject.export({ format: 'jwk' });
  return Buffer.concat([Buffer.from([0x04]), base64urlDecode(jwk.x), base64urlDecode(jwk.y)]);
}

function vapidPrivateKeyObject(env) {
  const publicRaw = base64urlDecode(env.VAPID_PUBLIC_KEY);
  const jwk = { ...uncompressedPointToJwk(publicRaw), d: env.VAPID_PRIVATE_KEY };
  return crypto.createPrivateKey({ key: jwk, format: 'jwk' });
}

// RFC 8292 VAPID: a short-lived ES256 JWT identifying this server to the
// push service, plus the public key so the push service can verify it
// without a prior registration step.
function buildVapidAuthHeader(env, pushServiceOrigin) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = {
    aud: pushServiceOrigin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT || 'mailto:info@shroyalschools.com',
  };
  const unsigned = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(claims))}`;
  const privateKey = vapidPrivateKeyObject(env);
  // dsaEncoding 'ieee-p1363' gives the raw r||s (64-byte) signature a
  // JWS needs — Node's default is ASN.1 DER, which is not valid here.
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  const jwt = `${unsigned}.${base64urlEncode(signature)}`;
  return `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`;
}

// RFC 8291 message encryption (the aes128gcm content-coding from RFC
// 8188, single-record — every Web Push payload here is well under the
// 4KB practical size limit, so no multi-record chunking is needed).
function encryptPayload({ p256dhB64, authB64, plaintext }) {
  const uaPublic = base64urlDecode(p256dhB64); // subscriber's public key, 65-byte uncompressed point
  const authSecret = base64urlDecode(authB64); // 16-byte auth secret

  const ephemeral = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const asPublicRaw = publicKeyObjectToRawPoint(ephemeral.publicKey);

  const uaPublicKeyObject = crypto.createPublicKey({ key: uncompressedPointToJwk(uaPublic), format: 'jwk' });
  const ecdhSecret = crypto.diffieHellman({ privateKey: ephemeral.privateKey, publicKey: uaPublicKeyObject });

  // ecdh_secret -> IKM, per RFC 8291 §3.4 (one combined HKDF-Extract +
  // HKDF-Expand call — Node's hkdfSync performs both steps together).
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'utf8'), uaPublic, asPublicRaw]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', ecdhSecret, authSecret, keyInfo, 32));

  // IKM -> content-encryption key + nonce, per RFC 8188 (aes128gcm),
  // salted with a fresh random 16-byte salt for this message only.
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'utf8'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'utf8'), 12));

  // Single-record body: plaintext + a 0x02 delimiter octet (marks "last
  // record", RFC 8188 §2), then AES-128-GCM with the derived cek/nonce.
  const recordPlaintext = Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(recordPlaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const header = Buffer.concat([salt, recordSize, Buffer.from([asPublicRaw.length]), asPublicRaw]);

  return Buffer.concat([header, ciphertext, authTag]);
}

// Sends one push message to one subscription. Never throws — mirrors
// email.js's sendEmail() contract exactly, including the {sent, reason}
// shape, so callers can log/ignore failures without a try/catch of
// their own. shouldDelete=true means the push service itself reported
// the subscription as gone (410 Gone / 404 Not Found — uninstalled,
// permission revoked, or browser data cleared); the caller should
// remove that push_subscriptions row.
export async function sendWebPush(env, subscription, payloadObj) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const body = encryptPayload({
      p256dhB64: subscription.p256dh,
      authB64: subscription.auth,
      plaintext: JSON.stringify(payloadObj),
    });
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'content-encoding': 'aes128gcm',
        ttl: '86400',
        authorization: buildVapidAuthHeader(env, endpointUrl.origin),
      },
      body,
    });
    if (res.status === 404 || res.status === 410) {
      return { sent: false, reason: 'expired', shouldDelete: true };
    }
    if (!res.ok) {
      console.error('web push send failed', res.status, await res.text().catch(() => ''));
      return { sent: false, reason: 'provider_error' };
    }
    return { sent: true, reason: null };
  } catch (err) {
    console.error('web push send threw', err);
    return { sent: false, reason: 'provider_error' };
  }
}

// Sends to every device a guardian has subscribed from, and prunes any
// subscription the push service reports as gone. sql is passed in
// (rather than imported/opened here) so callers already holding a
// connection — e.g. the announcements publish flow, which is already
// mid-transaction with one — reuse it instead of opening a second one.
export async function sendWebPushToGuardian(env, sql, guardianId, payloadObj) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return { attempted: 0, sent: 0, reason: 'not_configured' };
  }
  const subs = await sql`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE guardian_id = ${guardianId}`;
  let sent = 0;
  for (const row of subs.rows) {
    const result = await sendWebPush(env, row, payloadObj);
    if (result.sent) sent += 1;
    if (result.shouldDelete) {
      await sql`DELETE FROM push_subscriptions WHERE id = ${row.id}`;
    }
  }
  return { attempted: subs.rows.length, sent };
}
