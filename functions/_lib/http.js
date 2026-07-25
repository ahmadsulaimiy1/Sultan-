// Small response helpers shared across the portal's Pages Functions —
// keeps every route's success/error shape identical to what the
// frontend already expects (JSON body, optional extra headers for
// Set-Cookie).
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
