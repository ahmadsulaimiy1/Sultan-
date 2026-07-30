#!/usr/bin/env node
// One-time VAPID key-pair generator for Web Push (see
// functions/_lib/web-push.js). Run locally — never inside a request —
// and paste the three printed values into Cloudflare Pages' environment
// variables (Preview and Production separately, same as RESEND_API_KEY):
//
//   node scripts/generate-vapid-keys.js
//
// VAPID_PUBLIC_KEY is not a secret — it's also the applicationServerKey
// a subscribing browser needs, exposed to the frontend via the public
// GET /api/portal/push-public-key endpoint. VAPID_PRIVATE_KEY signs
// every outgoing push and must be kept as secret as RESEND_API_KEY.
const crypto = require('crypto');

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });

const publicRaw = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x, 'base64url'),
  Buffer.from(publicJwk.y, 'base64url'),
]);

console.log('Add these three environment variables to Cloudflare Pages (Preview + Production):\n');
console.log(`VAPID_PUBLIC_KEY=${base64url(publicRaw)}`);
console.log(`VAPID_PRIVATE_KEY=${privateJwk.d}`);
console.log('VAPID_SUBJECT=mailto:info@shroyalschools.com');
console.log('\nVAPID_PUBLIC_KEY is not secret (it is sent to browsers). VAPID_PRIVATE_KEY must be kept as confidential as RESEND_API_KEY.');
