// Deterministic Markdown/plain-text export for office_correspondence.
// No AI call, no new dependency — safe by construction because
// sanitize-html.js has already reduced body_html to exactly the tag
// set below (p, ul, ol, li, strong, em, b, i, u, br) before it is ever
// stored, so this converter only ever needs to handle that fixed,
// known vocabulary rather than arbitrary HTML.
function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function splitBlocks(html) {
  // Split on top-level <p>...</p> and <ul>/<ol>...</ul>/</ol> blocks,
  // preserving order. Anything outside a recognised block (stray text)
  // is treated as its own paragraph.
  const blocks = [];
  const re = /<p>([\s\S]*?)<\/p>|<(ul|ol)>([\s\S]*?)<\/\2>/g;
  let match;
  while ((match = re.exec(html))) {
    if (match[1] !== undefined) blocks.push({ type: 'p', inner: match[1] });
    else blocks.push({ type: match[2], inner: match[3] });
  }
  return blocks;
}

function listItems(inner) {
  const items = [];
  const re = /<li>([\s\S]*?)<\/li>/g;
  let match;
  while ((match = re.exec(inner))) items.push(match[1]);
  return items;
}

function stripInlineToMarkdown(inner) {
  return decodeEntities(
    inner
      .replace(/<br\s*\/?>/gi, '  \n')
      .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
      .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '_$2_')
      .replace(/<u>([\s\S]*?)<\/u>/gi, '$1')
  ).trim();
}

function stripInlineToPlainText(inner) {
  return decodeEntities(
    inner
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(strong|b|em|i|u)>/gi, '')
  ).trim();
}

export function htmlToMarkdown(html) {
  if (!html) return '';
  return splitBlocks(html).map((block) => {
    if (block.type === 'p') return stripInlineToMarkdown(block.inner);
    const marker = block.type === 'ol' ? (i) => `${i + 1}.` : () => '-';
    return listItems(block.inner).map((li, i) => `${marker(i)} ${stripInlineToMarkdown(li)}`).join('\n');
  }).filter(Boolean).join('\n\n');
}

export function htmlToPlainText(html) {
  if (!html) return '';
  return splitBlocks(html).map((block) => {
    if (block.type === 'p') return stripInlineToPlainText(block.inner);
    return listItems(block.inner).map((li, i) => `${i + 1}. ${stripInlineToPlainText(li)}`).join('\n');
  }).filter(Boolean).join('\n\n');
}
