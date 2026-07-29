// Renders a QR code (SVG) encoding the public verification URL for a
// given receipt number — mirrors functions/api/certificates/qr.js and
// functions/api/identity/qr.js exactly.
import { qrSvg } from '../../_lib/qrcode.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return new Response('Missing ref parameter.', { status: 400 });

  const origin = env.SITE_ORIGIN || url.origin;
  const verifyUrl = `${origin}/verify-receipt/?ref=${encodeURIComponent(ref)}`;
  const svg = qrSvg(verifyUrl, { width: 240, margin: 2 });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=86400',
    },
  });
}
