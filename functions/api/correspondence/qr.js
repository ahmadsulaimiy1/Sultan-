// QR code (SVG) encoding the public verification URL for an issued
// office_correspondence reference number. Mirrors functions/api/
// graduation-documents/qr.js exactly.
import { qrSvgForPrint } from '../../_lib/qrcode.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return new Response('Missing ref parameter.', { status: 400 });

  const origin = env.SITE_ORIGIN || url.origin;
  const verifyUrl = `${origin}/verify-correspondence/?ref=${encodeURIComponent(ref)}`;
  const svg = qrSvgForPrint(verifyUrl, { width: 160, errorCorrectionLevel: 'M' });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=86400',
    },
  });
}
