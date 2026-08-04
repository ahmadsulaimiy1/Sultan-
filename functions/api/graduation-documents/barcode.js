// Code 128 (Subset B) barcode (SVG) encoding the raw reference number
// for a Graduation Document — spec §15. Distinct purpose from the QR
// endpoint alongside it: this exists for legacy institutional
// document-management scanners that read 1D barcodes into a
// record-lookup field but do not decode QR payloads as URLs — a
// university registrar's or ministry's existing scanning equipment is
// exactly the audience this serves.
import { barcode128Svg } from '../../_lib/barcode128.js';

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();
  if (!ref) return new Response('Missing ref parameter.', { status: 400 });

  let svg;
  try {
    svg = barcode128Svg(ref, { unitWidth: 2, height: 60, margin: 10 });
  } catch (err) {
    return new Response('Could not encode that reference number as a Code 128 barcode: ' + (err && err.message ? err.message : 'unknown error'), { status: 400 });
  }

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=86400',
    },
  });
}
