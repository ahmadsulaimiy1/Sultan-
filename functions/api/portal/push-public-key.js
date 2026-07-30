// Public endpoint — a VAPID public key is not a secret (RFC 8292); it's
// exactly the applicationServerKey a browser needs to call
// pushManager.subscribe(). No session required. Returns null when the
// school hasn't generated real VAPID keys yet (see
// scripts/generate-vapid-keys.js) so the frontend can hide the "Enable
// Push Notifications" toggle instead of offering a subscribe button
// that would fail.
import { json } from '../../_lib/http.js';

export async function onRequestGet({ env }) {
  return json({ publicKey: env.VAPID_PUBLIC_KEY || null });
}
