// QR code (SVG) encoding the public verification URL for a Graduation
// Document reference number — spec §14. Error correction level Q (not
// the M this project's other QR endpoints use) because these documents
// are higher-security and more likely to be photocopied/faxed; Q's
// extra redundancy tolerates more real-world degradation. Mirrors
// functions/api/certificates/qr.js exactly otherwise.
import { qrSvgForPrint } from '../../_lib/qrcode.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return new Response('Missing ref parameter.', { status: 400 });

  const origin = env.SITE_ORIGIN || url.origin;
  const verifyUrl = `${origin}/verify-graduation-document/?ref=${encodeURIComponent(ref)}`;
  const svg = qrSvgForPrint(verifyUrl, { width: 240, errorCorrectionLevel: 'Q' });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=86400',
    },
  });
}
