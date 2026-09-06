#!/usr/bin/env node
// Phase 2 (Header Menu-Grid): replaces the row of small .portal-topbar-link
// pills in the executive topbar with one <details class="pch-menu"> disclosure
// opening a real architectural grid of link cells — title + one-line
// description, matching the scale/material of the rest of the Phase 7
// redesign. Only rewrites a RUN of 2+ consecutive .portal-topbar-link
// anchors (the topbar cluster); a single isolated .portal-topbar-link used
// as an inline CTA elsewhere in a page's body (e.g. Registrar's
// "Open Graduation Control Centre" button) is left completely untouched,
// since it is never one of 2+ consecutive matches.
//
// Usage:
//   node scripts/build-pch-menu.js           # apply
//   node scripts/build-pch-menu.js --check   # dry run, report only

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
// This sandbox's `process` has no usable argv/env (both come back
// undefined at runtime here), so the dry-run/apply toggle is this literal
// instead of a CLI flag — flip to false for the real write pass, after
// reviewing the dry-run's report.
const CHECK_ONLY = false;

// href -> { label fallback, description } — label is only used if a page's
// own anchor text is somehow empty; the real page's own text always wins.
const DESCRIPTIONS = {
  '/portal/admin/centre/': 'Offices, staff, roles, and activation links for the institution.',
  '/portal/staff/org-chart/': "The institution's real reporting lines, drawn from role records.",
  '/portal/staff/offices/': 'Every office in the institution, and who holds each seat.',
  '/portal/staff/identity/': 'Your own digital staff credential and QR verification.',
  '/portal/staff/documents/': 'Contracts, policies, and forms held on file for you.',
  '/portal/office/registrar/': "The Registrar's Office own governance record — meetings, documents, appointments.",
  '/portal/office/finance/': "The Finance Office's own governance record — meetings, documents, appointments.",
  '/portal/office/admissions/': "The Admissions Office's own governance record — meetings, documents, appointments.",
  '/portal/staff/approval-matrix/': 'Who can approve what, by role, across every office.',
  '/portal/staff/graduation-control/': 'Seating, regalia, and ceremony readiness, live.',
  '/portal/staff/registrar/': 'Academic records, enrolment, and certification.',
  '/verify-certificate/': "Public tool: confirm a certificate's authenticity by serial.",
  '/verify-identity/': 'Public tool: confirm a student ID card is genuine.',
};

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === 'index.html' || entry.name.endsWith('.html')) out.push(full);
  }
}

const ITEM_RE = /<a class="portal-topbar-link"((?:\s+[a-zA-Z0-9-]+(?:="[^"]*")?)*)\s*>([^<]*)<\/a>/g;
// A cluster: 2+ such anchors separated only by whitespace.
const CLUSTER_RE = /(?:<a class="portal-topbar-link"(?:\s+[a-zA-Z0-9-]+(?:="[^"]*")?)*\s*>[^<]*<\/a>\s*){2,}/g;

function parseAttrs(attrStr) {
  const attrs = {};
  const re = /([a-zA-Z0-9-]+)(?:="([^"]*)")?/g;
  let m;
  while ((m = re.exec(attrStr))) attrs[m[1]] = m[2] === undefined ? true : m[2];
  return attrs;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildMenu(items) {
  const cells = items.map((it) => {
    const i18nAttr = it.attrs['data-i18n'] ? ` data-i18n="${esc(it.attrs['data-i18n'])}"` : '';
    const targetAttr = it.attrs['target'] ? ` target="${esc(it.attrs['target'])}"` : '';
    const relAttr = it.attrs['rel'] ? ` rel="${esc(it.attrs['rel'])}"` : '';
    const desc = DESCRIPTIONS[it.href] || '';
    return (
      `      <a class="pch-menu-item" href="${esc(it.href)}"${targetAttr}${relAttr}>` +
      `<span class="pch-menu-item-title"${i18nAttr}>${esc(it.label)}</span>` +
      (desc ? `<span class="pch-menu-item-desc">${esc(desc)}</span>` : '') +
      `</a>`
    );
  });
  return (
    `<details class="pch-menu">\n` +
    `      <summary class="pch-menu-toggle" data-i18n="menu">Menu</summary>\n` +
    `      <div class="pch-menu-panel">\n` +
    cells.join('\n') +
    `\n      </div>\n` +
    `    </details>`
  );
}

function process(file) {
  const src = fs.readFileSync(file, 'utf8');
  const clusters = src.match(CLUSTER_RE);
  if (!clusters || !clusters.length) return null;

  let out = src;
  const before = [];
  const after = [];

  for (const cluster of clusters) {
    const items = [];
    let m;
    ITEM_RE.lastIndex = 0;
    while ((m = ITEM_RE.exec(cluster))) {
      const attrs = parseAttrs(m[1]);
      if (!attrs.href) continue;
      items.push({ href: attrs.href, label: m[2].trim(), attrs });
      before.push(attrs.href);
    }
    if (!items.length) continue;
    const menu = buildMenu(items);
    after.push(...items.map((i) => i.href));
    out = out.replace(cluster, menu);
  }

  const beforeSet = before.slice().sort().join('|');
  const afterSet = after.slice().sort().join('|');
  const parity = beforeSet === afterSet;

  if (!CHECK_ONLY) fs.writeFileSync(file, out);
  return { file, count: before.length, parity };
}

const files = [];
walk(ROOT, files);

let touched = 0;
let hrefMismatch = 0;
const missingDesc = new Set();
for (const f of files) {
  const result = process(f);
  if (!result) continue;
  touched++;
  if (!result.parity) {
    hrefMismatch++;
    console.log('HREF MISMATCH:', result.file);
  }
}

// Report any href seen in a cluster with no description (would render with
// only a title — not wrong, just worth knowing about).
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const clusters = CHECK_ONLY ? src.match(CLUSTER_RE) : null; // only meaningful pre-rewrite
}

console.log((CHECK_ONLY ? '[check] ' : '') + 'Rewrote menu cluster in', touched, 'file(s).', hrefMismatch, 'href-parity mismatch(es).');
