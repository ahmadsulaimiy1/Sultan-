// Renders a QR code (SVG) encoding the public verification URL for a
// given certificate/Ijazah reference number — e.g. for
// <img src="/api/certificates/qr?ref=SHR-CERT-2026-000123"> on a
// printed certificate or in the Registrar's issuance confirmation.
// Deliberately doesn't check whether the reference number actually
// exists: encoding is just "turn this URL into a QR," identical to how
// a browser doesn't validate a URL before rendering its favicon — the
// verify endpoint is what confirms genuineness, not this one.
//
// Uses the print-grade renderer even though this is served to a screen.
// These SVGs get printed — a parent prints the receipt, a student prints the
// ID card — and the old renderer's stroked paths came out of the print
// pipeline as unreadable hairlines. See qrSvgForPrint's own note.
import { qrSvgForPrint } from '../../_lib/qrcode.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return new Response('Missing ref parameter.', { status: 400 });

  const origin = env.SITE_ORIGIN || url.origin;
  const verifyUrl = `${origin}/verify-certificate/?ref=${encodeURIComponent(ref)}`;
  const svg = qrSvgForPrint(verifyUrl, { width: 240, errorCorrectionLevel: 'Q' });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      // Certificates are issued once and rarely re-queried by URL, but
      // the reference number never changes once issued (revocation is
      // status, not identity) — the QR image itself is safe to cache.
      'cache-control': 'public, max-age=86400',
    },
  });
}
