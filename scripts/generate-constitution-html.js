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
const OUT = path.join(OUT_DIR, 'SHRS-Governance-Charter-Flagship-v7.0.html');

const KHATAM_SVG = '<svg class="corner-ornament" viewBox="0 0 100 100" aria-hidden="true"><rect x="20" y="20" width="60" height="60" fill="none" stroke="var(--gold-bright)" stroke-width="1.5"/><rect x="20" y="20" width="60" height="60" fill="none" stroke="var(--gold-bright)" stroke-width="1.5" transform="rotate(45 50 50)"/></svg>';

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
  const draftingNotes = [];
  let mode = 'chapters'; // 'chapters' | 'schedules' | 'notes'
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
      if (b.text.startsWith('DRAFTING NOTES')) { mode = 'notes'; curCeremony = null; continue; }
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
    if (mode === 'notes') { draftingNotes.push(b); continue; }
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
        <div class="toc-part-title" style="margin-top:10px;"><a href="#drafting-notes">Drafting Notes — Not Part of the Charter</a></div>
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

  function renderDraftingNotes() {
    let html = `<div class="drafting-notes-page" id="drafting-notes">
      <div class="drafting-notes-banner">Not part of the Charter</div>
      <h2>Drafting Notes</h2>`;
    for (const b of draftingNotes) {
      if (b.type === 'p') {
        if (/^Notes? \d/.test(b.text) || b.text.includes('remain accurate for the Articles')) {
          html += `<p class="drafting-note-divider">${inline(b.text)}</p>`;
        } else {
          html += `<p class="drafting-note">${inline(b.text)}</p>`;
        }
      }
      if (b.type === 'clause') html += `<p class="drafting-note" style="margin-left:0.3in;">${inline(b.text)}</p>`;
    }
    html += '</div>';
    return html;
  }

  const metaHtml = metaParagraphs.filter(Boolean).map((t) => {
    const m = /^\*\*([^*]+)\.\*\*\s*(.*)$/.exec(t);
    if (m) return `<div class="meta-panel"><div class="meta-label">${inline(m[1])}</div><p>${inline(m[2])}</p></div>`;
    return `<div class="meta-panel"><p>${inline(t)}</p></div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>The Governance Charter of Sultan Hanafi Royal Schools — Flagship Edition, Draft v7.0</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Inter:wght@400;500;600;700&family=Amiri:wght@400;700&family=Cairo:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../css/brand.css">
<link rel="stylesheet" href="../../css/constitution-print.css">
</head>
<body class="const-body">

<div class="const-toolbar">
  <span>The Governance Charter of Sultan Hanafi Royal Schools — Flagship Edition, Draft v7.0</span>
  <button onclick="window.print()">Print / Export to PDF</button>
</div>

<div class="page dark cover" id="cover">
  ${KHATAM_SVG}
  <img class="cover-crest" src="../../assets/images/crest-full.png" alt="Sultan Hanafi Royal Schools crest" />
  <div class="cover-eyebrow">Sultan Hanafi Royal Schools</div>
  <div class="cover-sub-line">Royal College &middot; Qur'an College &middot; School of Islamic &amp; Arabic Studies &middot; Nursery &amp; Primary School</div>
  <h1 class="cover-title">The Governance Charter</h1>
  <div class="cover-title-sub">of Sultan Hanafi Royal Schools</div>
  <div class="cover-rule"></div>
  <div class="cover-version">Edition VII</div>
  <div class="cover-footer-line">
    <div class="cover-footer-rule"></div>
    <div class="cover-footer-text">
      <span>Flagship Edition</span>
      <span>Est. December 2017 &middot; Ikorodu, Lagos State, Nigeria</span>
    </div>
  </div>
</div>

${tocHtml}

<div class="chapter" id="about-this-edition" style="page-break-before:always;">
  <div class="chapter-eyebrow">Front Matter</div>
  <h2>About This Edition</h2>
  ${metaHtml}
</div>

${renderProclamationPreamble()}

${partsHtml}

${renderExecution()}

${renderSchedules()}

${renderDraftingNotes()}

<div class="page dark back-cover" id="back-cover">
  ${KHATAM_SVG}
  <img class="back-cover-crest" src="../../assets/images/crest-full.png" alt="Sultan Hanafi Royal Schools crest" />
  <div class="back-cover-rule"></div>
  <div class="back-cover-name">Sultan Hanafi Royal Schools</div>
  <div class="back-cover-schools">Royal College &middot; Qur'an College &middot; School of Islamic &amp; Arabic Studies &middot; Nursery &amp; Primary School</div>
  <div class="back-cover-rule small"></div>
  <div class="back-cover-meta">
    <div><span>Instrument</span>The Governance Charter of Sultan Hanafi Royal Schools</div>
    <div><span>Edition</span>Flagship Edition, Draft v7.0</div>
    <div><span>Founded</span>December 2017 &middot; Ikorodu, Lagos State, Nigeria</div>
  </div>
  <div class="back-cover-rule small"></div>
  <p class="back-cover-note">This edition is prepared for the consideration and adoption of the Board of Governors under Chapter XVIII of this Charter. It is not yet effective, and confers no rights or obligations until so adopted.</p>
</div>

</body>
</html>
`;

  fs.writeFileSync(OUT, html, 'utf8');
  console.log('Wrote', OUT, html.length, 'bytes,', parts.length, 'Parts,', parts.reduce((n, p) => n + p.chapters.length, 0), 'Chapters');
}

main();
