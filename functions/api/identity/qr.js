// Renders a QR code (SVG) encoding the public verification URL for a
// given SHRS identity number — e.g. for
// <img src="/api/identity/qr?id=SHR-STU-2026-000123"> on a digital or
// printed ID card. Mirrors functions/api/certificates/qr.js exactly:
// doesn't check whether the identity number actually exists, since
// encoding is just "turn this URL into a QR" — /api/identity/verify is
// what confirms genuineness.
import { qrSvg } from '../../_lib/qrcode.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const idNo = (url.searchParams.get('id') || '').trim();
  if (!idNo) return new Response('Missing id parameter.', { status: 400 });

  const origin = env.SITE_ORIGIN || url.origin;
  const verifyUrl = `${origin}/verify-identity/?id=${encodeURIComponent(idNo)}`;
  const svg = qrSvg(verifyUrl, { width: 240, margin: 2 });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      // Identity numbers never change once issued (status changes don't
      // touch the number itself), so the QR image is safe to cache.
      'cache-control': 'public, max-age=86400',
    },
  });
}
