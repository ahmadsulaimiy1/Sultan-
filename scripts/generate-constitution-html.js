// Generates the flagship HTML edition of "The Constitution of Sultan
// Hanafi Royal Schools" (Draft v6.0) from docs/shrs-constitution-2026-draft.md
// — the markdown file remains the single source of truth; this script is
// a line-classifying transcriber into the visual language established by
// css/constitution-print.css (itself adapted from css/prospectus.css and
// docs/prospectus-editorial-bible.md), not an independent drafting source.
//
// Unlike the DOCX generator, curated one-off pages (cover, proclamation,
// Part dividers, table of contents) use fixed-height .page containers so
// their content can be vertically centred; the Chapter/Article body flows
// normally so the browser's print engine paginates it, with page breaks
// only at Chapter boundaries — this is why there is no hardcoded page
// number to maintain here (the Table of Contents links to real in-page
// anchors instead; see the Drafting Notes for why).
//
// Output: docs/exports/SHRS-Constitution-Flagship-v6.0.html
// Then render to PDF: node scripts/render-constitution-pdf.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'shrs-constitution-2026-draft.md');
const OUT_DIR = path.join(ROOT, 'docs', 'exports');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, 'SHRS-Governance-Charter-Flagship-Edition.html');

const KHATAM_SVG = '<svg class="corner-ornament" viewBox="0 0 100 100" aria-hidden="true"><rect x="20" y="20" width="60" height="60" fill="none" stroke="var(--gold-bright)" stroke-width="1.5"/><rect x="20" y="20" width="60" height="60" fill="none" stroke="var(--gold-bright)" stroke-width="1.5" transform="rotate(45 50 50)"/></svg>';
// Same eight-point geometric mark as KHATAM_SVG, unpositioned (no
// .corner-ornament class) so it can be centred and sized per use on the
// half-title and back cover, rather than pinned to a page corner.
const KHATAM_MARK_SVG = (stroke) => `<svg class="mark-ornament" viewBox="0 0 100 100" aria-hidden="true"><rect x="20" y="20" width="60" height="60" fill="none" stroke="${stroke}" stroke-width="1.5"/><rect x="20" y="20" width="60" height="60" fill="none" stroke="${stroke}" stroke-width="1.5" transform="rotate(45 50 50)"/></svg>`;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Inline markdown (**bold**, `code`, *italic*) -> HTML
function inline(text) {
  let t = esc(text);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/`(.+?)`/g, '<code>$1</code>');
  t = t.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  return t;
}

function main() {
  const raw = fs.readFileSync(SRC, 'utf8');
  const lines = raw.split('\n');

  // ---- Pass 1: split into a flat list of typed blocks ----
  const blocks = [];
  let i = 0;
  const metaParagraphs = [];
  let inMeta = true; // lines before the first '## ' heading are front-matter meta notes

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) { i++; continue; }
    if (line.trim() === '---') { i++; continue; }
    if (line.trim() === '') { i++; continue; }

    if (line.startsWith('## PART ')) {
      inMeta = false;
      blocks.push({ type: 'part', text: line.slice(3).trim() });
      i++; continue;
    }
    if (line.startsWith('## ')) {
      inMeta = false;
      blocks.push({ type: 'h1', text: line.slice(3).trim() });
      i++; continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h2', text: line.slice(4).trim() });
      i++; continue;
    }
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) { tableLines.push(lines[i]); i++; }
      const rows = tableLines
        .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
        .filter((cells, idx) => !(idx === 1 && cells.every((c) => /^-+$/.test(c))));
      blocks.push({ type: 'table', header: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (/^\([a-z0-9]+\)/i.test(line.trim())) {
      blocks.push({ type: 'clause', text: line.trim() });
      i++; continue;
    }

    if (inMeta) {
      metaParagraphs.push(line.trim());
    } else {
      blocks.push({ type: 'p', text: line.trim() });
    }
    i++;
  }

  // ---- Pass 2: group blocks into Parts -> Chapters -> content, plus schedules/notes ----
  const parts = []; // { title, chapters: [{ title, id, blocks: [] }] }
  let curPart = null;
  let curChapter = null;
  const schedules = [];
  let mode = 'chapters'; // 'chapters' | 'schedules'
  let proclamation = [];
  let preamble = [];
  let execution = [];
  let curCeremony = null; // 'proclamation' | 'preamble' | 'execution' | null

  for (const b of blocks) {
    if (b.type === 'h1') {
      if (b.text === 'CONSTITUTIONAL PROCLAMATION') { curCeremony = 'proclamation'; continue; }
      if (b.text === 'PREAMBLE') { curCeremony = 'preamble'; continue; }
      if (b.text === 'CERTIFICATE OF ADOPTION AND EXECUTION') { curCeremony = 'execution'; continue; }
      if (b.text === 'SCHEDULES') { mode = 'schedules'; curCeremony = null; continue; }
      curCeremony = null;
      curChapter = { title: b.text, id: 'ch-' + slugify(b.text), blocks: [] };
      if (curPart) curPart.chapters.push(curChapter);
      continue;
    }
    if (b.type === 'part') {
      curPart = { title: b.text, id: 'pt-' + slugify(b.text), chapters: [] };
      parts.push(curPart);
      continue;
    }
    if (curCeremony === 'proclamation') { proclamation.push(b); continue; }
    if (curCeremony === 'preamble') { preamble.push(b); continue; }
    if (curCeremony === 'execution') { execution.push(b); continue; }
    if (mode === 'schedules') { schedules.push(b); continue; }
    if (curChapter) curChapter.blocks.push(b);
  }

  // ---- Render helpers ----
  function renderTable(b) {
    const nCols = b.header.length;
    const wide = nCols > 5;
    const thead = '<thead><tr>' + b.header.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead>';
    const tbody = '<tbody>' + b.rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>';
    return `<div class="const-table-wrap"><table class="const-table${wide ? ' wide' : ''}">${thead}${tbody}</table></div>`;
  }

  function renderChapterBlock(b) {
    if (b.type === 'h2') return `<h3>${inline(b.text)}</h3>`;
    if (b.type === 'table') return renderTable(b);
    if (b.type === 'clause') return `<p class="clause">${inline(b.text)}</p>`;
    // Article 8 (entrenched Islamic-character clause) gets restrained pull-quote emphasis
    if (b.type === 'p' && /^\*\*Article 8\b/.test(b.text)) {
      return `<div class="entrenched"><span class="mark">&ldquo;</span>${inline(b.text)}</div>`;
    }
    return `<p class="article-body">${inline(b.text)}</p>`;
  }

  const partsHtml = parts.map((part, pi) => {
    const chaptersHtml = part.chapters.map((ch) => `
      <div class="chapter" id="${ch.id}">
        <div class="chapter-eyebrow">${inline(part.title.split('—')[0].trim())}</div>
        <h2>${inline(ch.title)}</h2>
        ${ch.blocks.map(renderChapterBlock).join('\n')}
      </div>`).join('\n');
    return `
      <div class="page dark part-divider" id="${part.id}">
        ${KHATAM_SVG}
        <div class="part-eyebrow">${inline(part.title.split('—')[0].trim())}</div>
        <h2 class="part-title">${inline(part.title.split('—').slice(1).join('—').trim())}</h2>
        <div class="part-index">Part ${pi + 1} of ${parts.length}</div>
      </div>
      ${chaptersHtml}`;
  }).join('\n');

  const tocHtml = `
    <div class="toc-page" id="toc">
      <div class="toc-eyebrow">Contents</div>
      <h2>Table of Contents</h2>
      ${parts.map((part) => `
        <div class="toc-part">
          <div class="toc-part-title"><a href="#${part.id}">${inline(part.title)}</a></div>
          ${part.chapters.map((ch) => `<a class="toc-chapter" href="#${ch.id}">${inline(ch.title)}</a>`).join('\n')}
        </div>`).join('\n')}
      <div class="toc-part">
        <div class="toc-part-title"><a href="#schedules">Schedules</a></div>
      </div>
      <p class="toc-hint">This is a born-digital edition: every entry above is a live link. Page numbers are shown in the running footer rather than here, since a linked table of contents stays accurate through re-pagination without manual re-verification.</p>
    </div>`;

  function renderProclamationPreamble() {
    const procHtml = proclamation.filter((b) => b.type === 'p').map((b, idx) =>
      `<p${idx === 0 ? ' class="drop-cap"' : ''}>${inline(b.text)}</p>`).join('\n');
    const preambleParas = preamble.filter((b) => b.type === 'p');
    const lastIdx = preambleParas.length - 1;
    const preambleHtml = preambleParas.map((b, idx) =>
      idx === lastIdx
        ? `<p class="now-therefore">${inline(b.text)}</p>`
        : `<p${idx === 0 ? ' class="drop-cap"' : ''}>${inline(b.text)}</p>`).join('\n');
    return `
      <div class="page dark ceremony" id="proclamation">
        ${KHATAM_SVG}
        <div class="ceremony-eyebrow">Constitutional Proclamation</div>
        ${procHtml}
      </div>
      <div class="page charcoal ceremony" id="preamble">
        ${KHATAM_SVG}
        <div class="ceremony-eyebrow">Preamble</div>
        ${preambleHtml}
      </div>`;
  }

  function renderExecution() {
    // Ceremony pages are dark/charcoal; .article-body and .const-table are
    // styled for the light body pages and would render near-invisible here
    // (dark ink text, ivory-toned borders) — a real legibility bug caught
    // before shipping, not a stylistic choice. Plain, unclassed <p> tags
    // pick up .ceremony p's light-on-dark styling instead, and the table
    // gets its own .execution-table rule in css/constitution-print.css.
    let bodyHtml = '';
    for (const b of execution) {
      if (b.type === 'table') {
        const thead = '<thead><tr>' + b.header.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead>';
        const tbody = '<tbody>' + b.rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>';
        bodyHtml += `<table class="execution-table">${thead}${tbody}</table>`;
        continue;
      }
      if (b.type === 'p') { bodyHtml += `<p>${inline(b.text)}</p>`; continue; }
      if (b.type === 'clause') { bodyHtml += `<p>${inline(b.text)}</p>`; }
    }
    return `
      <div class="page charcoal ceremony execution-page" id="execution">
        ${KHATAM_SVG}
        <div class="ceremony-eyebrow">Certificate of Adoption and Execution</div>
        ${bodyHtml}
      </div>`;
  }

  function renderSchedules() {
    let html = '<div class="schedules-page" id="schedules"><h2 style="font-family:\'Cinzel\',\'Amiri\',serif;font-size:18pt;color:var(--navy);margin:0 0 20px;">Schedules</h2>';
    for (const b of schedules) {
      if (b.type === 'table') { html += renderTable(b); continue; }
      if (b.type === 'p') {
        const m = /^\*\*(Schedule [A-Z][^.]*)\.\*\*\s*(.*)$/.exec(b.text);
        if (m) {
          html += `<div class="schedule-entry"><div class="sched-label">${inline(m[1])}</div><p class="article-body">${inline(m[2])}</p></div>`;
        } else {
          html += `<p class="article-body">${inline(b.text)}</p>`;
        }
        continue;
      }
      if (b.type === 'clause') html += `<p class="clause">${inline(b.text)}</p>`;
    }
    html += '</div>';
    return html;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>The Governance Charter of Sultan Hanafi Royal Schools — Flagship Edition, Seventh Edition</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Inter:wght@400;500;600;700&family=Amiri:wght@400;700&family=Cairo:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../css/brand.css">
<link rel="stylesheet" href="../../css/constitution-print.css">
</head>
<body class="const-body">

<div class="const-toolbar">
  <span>The Governance Charter of Sultan Hanafi Royal Schools — Flagship Edition, Seventh Edition</span>
  <button onclick="window.print()">Print / Export to PDF</button>
</div>

<div class="page dark cover" id="cover">
  ${KHATAM_SVG}
  <img class="cover-crest" src="../../assets/images/crest-full.png" alt="Sultan Hanafi Royal Schools crest" />
  <div class="cover-eyebrow">Sultan Hanafi Royal Schools</div>
  <div class="cover-sub-line">Secular College &middot; Islamiyyah College &middot; Qur'an College &middot; Basic School &middot; Online &amp; Distance Learning School</div>
  <h1 class="cover-title">The Governance Charter</h1>
  <div class="cover-title-sub">of Sultan Hanafi Royal Schools</div>
  <div class="cover-rule"></div>
  <div class="cover-version">Edition VII</div>
  <div class="cover-footer-line">
    <div class="cover-footer-rule"></div>
    <div class="cover-footer-text">
      <span>Flagship Edition</span>
      <span>Est. July 2016 &middot; Ikorodu, Lagos State, Nigeria</span>
    </div>
  </div>
</div>

<div class="page half-title" id="half-title">
  <div class="half-title-mark">${KHATAM_MARK_SVG('var(--gold)')}</div>
  <div class="half-title-text">The Governance Charter</div>
</div>

<div class="page title-page" id="title-page">
  <img class="title-page-crest" src="../../assets/images/crest-full.png" alt="Sultan Hanafi Royal Schools crest" />
  <div class="title-page-eyebrow">Sultan Hanafi Royal Schools</div>
  <h1 class="title-page-h1">The Governance Charter</h1>
  <div class="title-page-sub">of Sultan Hanafi Royal Schools</div>
  <div class="title-page-rule"></div>
  <div class="title-page-edition">Seventh Edition</div>
  <div class="title-page-place">Ikorodu &middot; Lagos State &middot; Nigeria</div>
</div>

<div class="page copyright-page" id="copyright">
  <div class="copyright-block">
    <p class="copyright-line">&copy; Sultan Hanafi Royal Schools. All rights reserved within the Institution.</p>
    <p class="copyright-line">Seventh Edition. Previously issued, through six prior editions, as the Constitution of Sultan Hanafi Royal Schools.</p>
    <div class="copyright-rule"></div>
    <div class="copyright-submission">${metaParagraphs.map((t) => `<p>${inline(t)}</p>`).join('')}</div>
    <div class="copyright-rule"></div>
    <p class="copyright-line">Sultan Hanafi Royal Schools &middot; Secular College &middot; Islamiyyah College &middot; Qur'an College &middot; Basic School &middot; Online &amp; Distance Learning School</p>
    <p class="copyright-line">Founded July 2016 &middot; Ikorodu, Lagos State, Nigeria</p>
  </div>
</div>

<div class="page imprint-page" id="imprint">
  <div class="fm-eyebrow">Publisher's Imprint</div>
  <h2 class="fm-h2">Imprint</h2>
  <div class="fm-rule"></div>
  <table class="imprint-table">
    <tbody>
      <tr><th>Institution</th><td>Sultan Hanafi Royal Schools</td></tr>
      <tr><th>Publisher</th><td>Sultan Hanafi Royal Schools, acting through the Office of the Founder &amp; Head of Schools / Administrator</td></tr>
      <tr><th>Address</th><td>15, Imowonla Road, AP Bus Stop, Off Gberigbe&ndash;Agura Road, Ikorodu, Lagos State, Nigeria</td></tr>
      <tr><th>Website</th><td>shroyalschools.com</td></tr>
      <tr><th>Email</th><td>info@shroyalschools.com</td></tr>
      <tr><th>Telephone</th><td>+234 (0) 807 374 7650 &middot; +234 (0) 807 058 6860</td></tr>
      <tr><th>Copyright</th><td>&copy; Sultan Hanafi Royal Schools. All rights reserved within the Institution.</td></tr>
      <tr><th>Classification</th><td>Internal Governance Instrument &mdash; Board Submission Draft. Not yet adopted; carries no legal effect until the Board resolves under Chapter XVIII (see Certification, above).</td></tr>
      <tr><th>Archival Statement</th><td>Prepared for permanent retention in the Institution's governance archive. On adoption, the executed edition supersedes this draft as the archival copy of record.</td></tr>
      <tr><th>Printing Specification</th><td>Set for US Letter (8.5in &times; 11in) digital archival distribution and print-on-demand reproduction; not yet issued in a bound print run.</td></tr>
      <tr><th>Rights Statement</th><td>Prepared for the internal use of the Board of Governors, the Founder &amp; Head of Schools / Administrator, and the Institution's governance offices. Not for external commercial distribution without the Board's written authorisation.</td></tr>
    </tbody>
  </table>
</div>

<div class="page document-control-page" id="document-control">
  <div class="fm-eyebrow">Document Control</div>
  <h2 class="fm-h2">Publication Data</h2>
  <div class="fm-rule"></div>
  <table class="imprint-table">
    <tbody>
      <tr><th>Governance Charter ID</th><td>SHRS-GC-2026-001</td></tr>
      <tr><th>Publication ID</th><td>SHRS-PUB-GC-2026-001</td></tr>
      <tr><th>Book ID</th><td>SHRS-BK-GC-2026-001</td></tr>
      <tr><th>Document Number</th><td>GV-01 (Policy Coding Standard)</td></tr>
      <tr><th>Institutional Reference No.</th><td>SHRS/GC/VII/2026</td></tr>
      <tr><th>Edition</th><td>Seventh Edition</td></tr>
      <tr><th>Publication Year</th><td>2026</td></tr>
      <tr><th>Last Editorial Amendment</th><td>1 August 2026</td></tr>
      <tr><th>Scheduled Board Adoption</th><td>18 October 2026 (anticipated; not yet occurred &mdash; see Classification, Imprint page)</td></tr>
      <tr><th>ISBN</th><td>Reserved &mdash; to be assigned on formal print publication, should the Board direct one</td></tr>
      <tr><th>Citation Format</th><td>Sultan Hanafi Royal Schools, <em>The Governance Charter of Sultan Hanafi Royal Schools</em> (Edition VII, 2026) art [X]</td></tr>
    </tbody>
  </table>
  <div class="fm-subhead">Revision History</div>
  <table class="const-table revision-table">
    <thead><tr><th>Edition</th><th>Title</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>I&ndash;VI</td><td>Constitution of Sultan Hanafi Royal Schools</td><td>Superseded predecessor drafts</td></tr>
      <tr><td>VII</td><td>The Governance Charter of Sultan Hanafi Royal Schools</td><td>Current &mdash; Board submission draft</td></tr>
    </tbody>
  </table>
  <p class="fm-footnote">A full account of the reasoning behind each edition's changes is kept in the companion Editorial Record (not part of this instrument), rather than restated here as a bare list of dates.</p>
</div>

<div class="page institutional-info-page" id="institutional-info">
  <div class="fm-eyebrow">Institutional Information</div>
  <h2 class="fm-h2">Official Contact &amp; Verification</h2>
  <div class="fm-rule"></div>
  <table class="imprint-table">
    <tbody>
      <tr><th>Institution</th><td>Sultan Hanafi Royal Schools</td></tr>
      <tr><th>Official Website</th><td>https://shroyalschools.com</td></tr>
      <tr><th>Official Email</th><td>info@shroyalschools.com</td></tr>
      <tr><th>Official Address</th><td>15, Imowonla Road, AP Bus Stop, Off Gberigbe&ndash;Agura Road, Ikorodu, Lagos State, Nigeria</td></tr>
      <tr><th>Official Telephone</th><td>+234 (0) 807 374 7650 &middot; +234 (0) 807 058 6860</td></tr>
    </tbody>
  </table>
  <div class="qr-row">
    <div class="qr-card">
      <img src="../../assets/images/qr/qr-website.png" alt="QR code linking to the official Sultan Hanafi Royal Schools website" />
      <div class="qr-label">Official Website</div>
    </div>
    <div class="qr-card">
      <img src="../../assets/images/qr/qr-email.png" alt="QR code opening a message to the official Sultan Hanafi Royal Schools email address" />
      <div class="qr-label">Official Email</div>
    </div>
    <div class="qr-card">
      <img src="../../assets/images/qr/qr-contact.png" alt="QR code linking to the Sultan Hanafi Royal Schools contact page" />
      <div class="qr-label">Contact Page</div>
    </div>
    <div class="qr-card qr-reserved">
      <div class="qr-reserved-mark">${KHATAM_MARK_SVG('var(--gold)')}</div>
      <div class="qr-label">Governance Portal<br /><span>Reserved for future issue</span></div>
    </div>
  </div>
  <p class="fm-footnote">A public, authenticated Governance Portal is not yet live; the fourth code above is reserved for a future edition once that capability launches, rather than printed against a page that does not yet exist. The three codes above resolve to the Institution's current official website, email, and contact page.</p>
</div>

${tocHtml}

<div class="page reference-page" id="reference">
  <div class="fm-eyebrow">Reader's Reference</div>
  <h2 class="fm-h2">Sources of Authority &amp; Abbreviations</h2>
  <div class="fm-rule"></div>
  <div class="fm-subhead">Sources of Authority (Article 9B)</div>
  <ol class="authority-list">
    <li>The Holy Qur'an</li>
    <li>The authentic Sunnah of the Prophet Muhammad (peace be upon him)</li>
    <li>This Charter</li>
    <li>A future Constitution of Sultan Hanafi Royal Schools, once adopted (Article 178)</li>
    <li>The applicable laws of the Federal Republic of Nigeria</li>
    <li>Applicable international legal obligations, to the extent consistent with the above</li>
  </ol>
  <div class="fm-subhead">Abbreviations</div>
  <table class="const-table abbrev-table">
    <thead><tr><th>Abbreviation</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td>SHRS</td><td>Sultan Hanafi Royal Schools ("the Institution")</td></tr>
      <tr><td>HSA</td><td>Head of Schools / Administrator</td></tr>
      <tr><td>MT</td><td>Management Team</td></tr>
      <tr><td>ICT</td><td>Information &amp; Communications Technology</td></tr>
      <tr><td>HR</td><td>Human Resources</td></tr>
      <tr><td>Art.</td><td>Article, of this Charter</td></tr>
      <tr><td>Ch.</td><td>Chapter, of this Charter</td></tr>
    </tbody>
  </table>
  <p class="fm-footnote">This page is a reader's locator, not a source of constitutional authority in its own right: it restates nothing that Article 4 (Definitions) and Article 9B (Sources of Authority) do not already state as this Charter's own operative text, and confers no meaning beyond what those Articles establish.</p>
</div>

${renderProclamationPreamble()}

${partsHtml}

${renderExecution()}

${renderSchedules()}

<div class="page dark back-cover" id="back-cover">
  ${KHATAM_SVG}
  <div class="back-cover-inner">
    <img class="back-cover-crest" src="../../assets/images/crest-full.png" alt="Sultan Hanafi Royal Schools crest" />
    <div class="back-cover-rule"></div>
    <div class="back-cover-name">Sultan Hanafi Royal Schools</div>
    <div class="back-cover-schools">Secular College &middot; Islamiyyah College &middot; Qur'an College &middot; Basic School &middot; Online &amp; Distance Learning School</div>
    <div class="back-cover-rule small"></div>
    <div class="back-cover-meta">
      <div><span>Instrument</span>The Governance Charter of Sultan Hanafi Royal Schools</div>
      <div><span>Edition</span>Seventh Edition</div>
      <div><span>Founded</span>July 2016 &middot; Ikorodu, Lagos State, Nigeria</div>
    </div>
    <div class="back-cover-rule small"></div>
    <img class="back-cover-qr" src="../../assets/images/qr/qr-website.png" alt="QR code linking to the official Sultan Hanafi Royal Schools website" />
    <div class="back-cover-qr-label">shroyalschools.com</div>
    <div class="back-cover-rule small"></div>
    <div class="back-cover-motto">${KHATAM_MARK_SVG('var(--gold-bright)')}</div>
  </div>
</div>

</body>
</html>
`;

  fs.writeFileSync(OUT, html, 'utf8');
  console.log('Wrote', OUT, html.length, 'bytes,', parts.length, 'Parts,', parts.reduce((n, p) => n + p.chapters.length, 0), 'Chapters');
}

main();
