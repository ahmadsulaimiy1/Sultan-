// Minimal allowlist sanitizer for staff-authored correspondence body
// HTML (functions/api/portal/staff/documents/{save,draft}.js). Nothing
// in this codebase treats staff-authored rich text as safe to render
// verbatim elsewhere (graduation-documents.js escapes free-text fields
// like testimonials outright), and office_correspondence.body_html is
// rendered into a page every OTHER staff member holding the same
// office can open — an unsanitized <script>/onerror/iframe there is a
// real stored-XSS path between staff accounts, not a theoretical one.
// No sanitizer dependency exists in this project yet (no jsdom/
// DOMPurify), and this runs on the Workers edge runtime with no DOM —
// so this is a small, deliberately conservative regex-based allowlist
// rather than a general-purpose HTML parser. It does two things, and
// only two things:
//   1. Drops script/style/iframe/object/embed/link/meta tags ENTIRELY,
//      including their content.
//   2. For every other tag, strips ALL attributes (killing every
//      onclick=/onerror=/style=/href="javascript:..." vector at once)
//      and drops the tag itself unless its name is in ALLOWED_TAGS —
//      the tag's own text content is always preserved either way.
// This is not a general HTML sanitizer suitable for arbitrary
// third-party HTML; it is scoped to what this one feature needs
// (paragraphs, lists, basic inline emphasis) and no more.
const ALLOWED_TAGS = new Set(['p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'br']);
const STRIP_WITH_CONTENT = /<(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi;
const STRIP_VOID = /<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const ANY_TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

export function sanitizeCorrespondenceHtml(html) {
  if (!html) return '';
  let out = String(html);
  out = out.replace(STRIP_WITH_CONTENT, '');
  out = out.replace(STRIP_VOID, '');
  out = out.replace(COMMENTS, '');
  out = out.replace(ANY_TAG, (match, tagName) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
  });
  return out;
}
