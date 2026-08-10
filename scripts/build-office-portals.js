#!/usr/bin/env node
// Institutional Portal Ecosystem — stamps out one portal/office/<slug>/
// index.html per office in scripts/office-portal-config.js, all from a
// single template literal below. Every page is identical markup; the
// only per-office differences are the slug (data attribute the client
// JS reads) and the display name (title/breadcrumb) — everything else
// (appointments, meetings, documents, workflow) is fetched at runtime
// from /api/portal/staff/office/{slug}, so adding an office is one
// config row, not a new hand-built page.
//
// Usage: node scripts/build-office-portals.js
const fs = require('fs');
const path = require('path');
const { OFFICES } = require('./office-portal-config.js');

const ROOT = path.join(__dirname, '..');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pageHtml(office) {
  const name = esc(office.name);
  const deepLinkBanner = office.deepLink
    ? `<a class="office-deeplink-banner" href="${esc(office.deepLink.href)}">
      <span>${esc(office.deepLink.label)}</span>
      <span class="odb-sub">A dedicated operational tool exists for this office beyond this general portal &rarr;</span>
    </a>`
    : '';
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>${name} — Sultan Hanafi Royal Schools</title>
<link rel="icon" type="image/png" href="/assets/images/favicon.png">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<!-- THE SHARED PORTAL CHROME. These 33 pages are stamped from this file
     rather than assembled by scripts/build.js, and that is exactly how they
     came to be the only portal pages in the estate without it: the uplift that
     gave every other portal page its colophon, its prestige and motion layers,
     its clock and its arrival went through the other pipeline and never
     reached here. A site-wide sweep found it — 32 office pages reporting no
     footer at all while every neighbouring portal page had one, because
     portal-chrome.js (which injects the colophon at runtime) was not loaded.
     Anything added to the portal chrome belongs in BOTH templates below. -->
<link rel="stylesheet" href="/css/brand.css">
<link rel="stylesheet" href="/css/portal.css">
<link rel="stylesheet" href="/css/i18n.css">
<link rel="stylesheet" href="/css/prestige.css">
<link rel="stylesheet" href="/css/motion.css">
<link rel="stylesheet" href="/css/clock.css">
<link rel="stylesheet" href="/css/portal-chrome.css">
<script src="/js/locale-registry.js"></script>
<script src="/js/i18n-core.js"></script>
<script src="/js/portal-theme.js"></script>
<script src="/js/i18n.js" defer></script>
<script src="/js/portal-shell.js"></script>
</head>
<body class="portal-body" data-office-slug="${esc(office.slug)}">

<div class="portal-topbar">
  <a class="portal-brand" href="/">
    <img src="/assets/images/brand-mark.png" alt="Sultan Hanafi Royal Schools crest" />
    <span>Sultan Hanafi</span>
  </a>
  <div style="display:flex;align-items:center;gap:14px;">
    <div id="office-switcher-mount" hidden></div>
    <a class="portal-topbar-link" href="/portal/staff/offices/" data-i18n="portal.allOffices">All Offices</a>
    <span class="lang-switch-mount" data-locale-switcher></span>
    <button type="button" class="portal-logout" data-office-logout data-i18n="action.signOut">Sign Out</button>
  </div>
</div>

<main class="portal-main">
  <div class="portal-card" id="office-error" hidden>
    <h1 data-i18n="portal.loadFailed">Couldn't load this office</h1>
    <p class="sub" data-error-message data-i18n="portal.tryAgain">Please try again.</p>
    <a class="portal-back-link" href="/portal/staff/offices/" data-i18n="portal.backToAllOffices">&larr; Back to all offices</a>
  </div>

  <div class="portal-wrap" id="office-shell" hidden>
    <div class="exec-welcome">
      <div class="exec-welcome-eyebrow" id="office-eyebrow">OFFICE</div>
      <h1 id="office-name">${name}</h1>
      <div class="exec-welcome-role" id="office-holder-line" data-i18n="state.loading">Loading&hellip;</div>
      <div class="exec-welcome-stats">
        <div class="exec-welcome-stat"><span class="value" id="stat-staff-count">&mdash;</span><span class="label" data-i18n="portal.staffAssigned">Staff Assigned</span></div>
        <div class="exec-welcome-stat"><span class="value" id="stat-appointments">&mdash;</span><span class="label" data-i18n="portal.seatsRecorded">Seats Recorded</span></div>
        <div class="exec-welcome-stat"><span class="value" id="stat-pending-workflow">&mdash;</span><span class="label" data-i18n="portal.pendingWorkflow">Pending Workflow</span></div>
        <div class="exec-welcome-stat"><span class="value" id="stat-meetings">&mdash;</span><span class="label" data-i18n="portal.meetingsLogged">Meetings Logged</span></div>
      </div>
    </div>
${deepLinkBanner}

    <nav class="office-tabs" role="tablist" aria-label="Office sections">
      <button type="button" class="office-tab is-active" data-tab="dashboard" data-i18n="portal.dashboard">Dashboard</button>
      <button type="button" class="office-tab" data-tab="operations" hidden data-i18n="portal.operationsCentre">Operations Centre</button>
      <button type="button" class="office-tab" data-tab="overview" data-i18n="portal.overview">Overview</button>
      <button type="button" class="office-tab" data-tab="directory" data-i18n="portal.staffDirectory">Staff Directory</button>
      <button type="button" class="office-tab" data-tab="responsibilities" data-i18n="portal.responsibilities">Responsibilities</button>
      <button type="button" class="office-tab" data-tab="priorities" data-i18n="portal.strategicPriorities">Strategic Priorities</button>
      <button type="button" class="office-tab" data-tab="objectives" data-i18n="portal.annualObjectives">Annual Objectives</button>
      <button type="button" class="office-tab" data-tab="documents" data-i18n="portal.documents">Documents</button>
      <button type="button" class="office-tab" data-tab="messages">Messages<span class="office-tab-badge" id="messages-tab-badge" hidden></span></button>
      <button type="button" class="office-tab" data-tab="reports" data-i18n="portal.reports">Reports</button>
      <button type="button" class="office-tab" data-tab="analytics" data-i18n="portal.analytics">Analytics</button>
      <button type="button" class="office-tab" data-tab="workflow" data-i18n="portal.workflowCentre">Workflow Centre</button>
      <button type="button" class="office-tab" data-tab="notifications" data-i18n="portal.notifications">Notifications</button>
      <button type="button" class="office-tab" data-tab="meetings" data-i18n="portal.meetings">Meetings</button>
      <button type="button" class="office-tab" data-tab="resolutions" hidden data-i18n="portal.resolutions">Resolutions</button>
      <button type="button" class="office-tab" data-tab="archive" data-i18n="portal.archive">Archive</button>
    </nav>

    <div class="office-panel is-active" id="panel-dashboard">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.executiveDashboard">Executive Dashboard</h2><div class="meta" data-i18n="portal.liveSummary">A live summary of this office &mdash; seats, workload, and activity.</div></div>
        <div class="portal-stats">
          <div class="portal-stat"><div class="label" data-i18n="portal.staffAssigned">Staff Assigned</div><div class="value" id="dash-staff-count-echo"></div></div>
        </div>
        <div class="pfd-note" style="padding:0 26px 20px;">Use the tabs above to review the Staff Directory, Documents, Workflow Centre, and Meetings for this office.</div>
      </div>
    </div>

    <div class="office-panel" id="panel-operations">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.operationsCentre">Operations Centre</h2><div class="meta">Real, institution-scoped daily-operations data &mdash; students, staff, attendance, and admissions for this school specifically.</div></div>
        <div class="exec-stat-grid" style="padding:0 26px 22px;" id="operations-stats"></div>
      </div>
      <div class="portal-child-card" id="operations-hifz-section" hidden>
        <div class="portal-child-head"><h2>Hifz Programme</h2></div>
        <div class="exec-stat-grid" style="padding:0 26px 12px;" id="operations-hifz-stats"></div>
        <h3 class="pfd-subhead" style="padding:0 26px;" data-i18n="portal.byStage">By stage</h3>
        <div class="pfd-bars" style="padding:0 26px 22px;" id="operations-hifz-bars"></div>
      </div>
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.admissionsPipeline">Admissions Pipeline</h2><div class="meta">This school's own applications &mdash; full review at the Admissions Review Centre.</div></div>
        <div class="portal-stats" id="operations-admissions"></div>
        <div style="padding:0 26px 20px;"><a class="portal-back-link" href="/portal/staff/admissions/">Open Admissions Review Centre &rarr;</a></div>
      </div>
      <div class="portal-child-card" id="operations-frameworks-section" hidden>
        <div class="portal-child-head"><h2>Institutional Capability Frameworks</h2><div class="meta">Real schema, real Permission Engine grants, real data as it accumulates &mdash; Operational Framework Ready, not fabricated.</div></div>
        <div id="operations-frameworks"></div>
      </div>
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.notYetTracked">Not Yet Tracked</h2><div class="meta" data-i18n="portal.namedHonestly">Named honestly &mdash; no fabricated figures stand in for these.</div></div>
        <div id="operations-not-tracked"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-overview">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.officeOverview">Office Overview</h2></div>
        <p style="padding:20px 26px 0;line-height:1.6;color:var(--ink);" id="office-description"></p>
        <div class="office-overview-grid" style="margin:16px 26px 26px;">
          <div class="office-overview-field"><div class="label" data-i18n="portal.officeType">Office Type</div><div class="value" id="office-type-value"></div></div>
          <div class="office-overview-field"><div class="label" data-i18n="portal.layer">Layer</div><div class="value" id="office-layer-value"></div></div>
          <div class="office-overview-field"><div class="label" data-i18n="portal.parentOffice">Parent Office</div><div class="value" id="office-parent-value"></div></div>
        </div>
      </div>
      <div class="portal-child-card" id="committees-section" hidden>
        <div class="portal-child-head"><h2>Committees</h2><div class="meta" data-i18n="portal.standingCommittees">Standing committees of this office.</div></div>
        <div style="padding:6px 26px 20px;" id="committees-list"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-directory">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.staffDirectory">Staff Directory</h2><div class="meta">Every recorded seat for this office, including any awaiting appointment.</div></div>
        <div style="padding:20px 26px;" id="directory-list"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-responsibilities">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.responsibilities">Responsibilities</h2></div>
        <p style="padding:20px 26px;line-height:1.6;color:var(--ink);" id="responsibilities-text"></p>
        <p class="pfd-note" style="padding:0 26px 20px;">See the full <a id="responsibilities-matrix-link" href="/policies/" data-i18n="nav.policies">Policies Centre</a> for governing documents.</p>
      </div>
    </div>

    <div class="office-panel" id="panel-priorities">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.strategicPriorities">Strategic Priorities</h2></div>
        <div id="priorities-panel-body"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-objectives">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.annualObjectives">Annual Objectives</h2></div>
        <div id="objectives-panel-body"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-documents">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.documents">Documents</h2></div>
        <div id="documents-list"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-messages">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.messages">Messages</h2><div class="meta">Real correspondence from parents and guardians, addressed to this office directly.</div></div>
        <div id="office-messages-body"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-reports">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.reports">Reports</h2></div>
        <div style="padding:20px 26px;" id="reports-panel-body"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-analytics">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.analytics">Analytics</h2></div>
        <div style="padding:20px 26px;" id="analytics-panel-body"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-workflow">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.workflowCentre">Workflow Centre</h2><div class="meta" data-i18n="portal.awaitingApproval">Items awaiting this office's approval.</div></div>
        <div id="workflow-list"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-notifications">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.notifications">Notifications</h2></div>
        <div style="padding:20px 26px;" id="notifications-panel-body"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-meetings">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.meetings">Meetings</h2></div>
        <div style="padding:20px 26px;" id="meetings-list"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-resolutions">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.resolutions">Resolutions</h2><div class="meta" data-i18n="portal.governanceRegister">The Board's governance register for this office.</div></div>
        <div style="padding:20px 26px;" id="resolutions-list"></div>
      </div>
    </div>

    <div class="office-panel" id="panel-archive">
      <div class="portal-child-card">
        <div class="portal-child-head"><h2 data-i18n="portal.archive">Archive</h2><div class="meta" data-i18n="portal.pastMeetings">Past meetings and closed items for this office.</div></div>
        <div style="padding:20px 26px;" id="archive-list"></div>
      </div>
    </div>
  </div>
</main>

<script>
document.addEventListener('DOMContentLoaded', function(){
  var btn = document.querySelector('[data-office-logout]');
  if (btn) btn.addEventListener('click', function(){
    fetch('/api/portal/staff/logout', { method: 'POST' }).catch(function(){}).then(function(){ window.location.href = '/portal/staff/login/'; });
  });
  var staffCountEl = document.getElementById('stat-staff-count');
  var echoEl = document.getElementById('dash-staff-count-echo');
  if (staffCountEl && echoEl) {
    var obs = new MutationObserver(function(){ echoEl.textContent = staffCountEl.textContent; });
    obs.observe(staffCountEl, { childList: true });
  }
});
</script>
<script src="/js/portal-office-switcher.js" defer></script>
<script src="/js/portal-office.js" defer></script>
<script src="/js/prestige.js" defer></script>
<script src="/js/motion.js" defer></script>
<script src="/js/hijri.js" defer></script>
<script src="/js/portal-chrome.js" defer></script>
<script src="/js/footer-live.js" defer></script>
<script src="/js/clock.js" defer></script>
</body>
</html>
`;
}

function directoryIndexHtml(officesByLayer, layerLabels) {
  const layerBlocks = Object.keys(officesByLayer).map((layerKey) => {
    const rows = officesByLayer[layerKey].map((o) =>
      `          <a class="office-index-row" href="/portal/office/${esc(o.slug)}/">${esc(o.name)}</a>`
    ).join('\n');
    return `        <div class="office-index-layer">\n          <h3>${esc(layerLabels[layerKey] || layerKey)}</h3>\n${rows}\n        </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>All Offices — Sultan Hanafi Royal Schools</title>
<link rel="icon" type="image/png" href="/assets/images/favicon.png">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<!-- THE SHARED PORTAL CHROME. These 33 pages are stamped from this file
     rather than assembled by scripts/build.js, and that is exactly how they
     came to be the only portal pages in the estate without it: the uplift that
     gave every other portal page its colophon, its prestige and motion layers,
     its clock and its arrival went through the other pipeline and never
     reached here. A site-wide sweep found it — 32 office pages reporting no
     footer at all while every neighbouring portal page had one, because
     portal-chrome.js (which injects the colophon at runtime) was not loaded.
     Anything added to the portal chrome belongs in BOTH templates below. -->
<link rel="stylesheet" href="/css/brand.css">
<link rel="stylesheet" href="/css/portal.css">
<link rel="stylesheet" href="/css/i18n.css">
<link rel="stylesheet" href="/css/prestige.css">
<link rel="stylesheet" href="/css/motion.css">
<link rel="stylesheet" href="/css/clock.css">
<link rel="stylesheet" href="/css/portal-chrome.css">
<script src="/js/locale-registry.js"></script>
<script src="/js/i18n-core.js"></script>
<script src="/js/portal-theme.js"></script>
<script src="/js/i18n.js" defer></script>
<script src="/js/portal-shell.js"></script>
<style>
  .office-index-wrap{max-width:960px;margin:0 auto;padding:40px 20px 80px;}
  .office-index-layer{margin-bottom:36px;}
  /* --gold-bright is the DEEP gold on the pale editions, which is right on
     cream and 1.95:1 on the espresso ground Royal and Midnight give this page.
     --portal-heading is the one token that already knows which ground it is
     standing on, because portal.css flips it per edition. */
  .office-index-layer h3{font-family:'Cinzel','Amiri',serif;font-size:0.82rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--portal-heading);border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:4px;}
  .office-index-row{display:block;padding:14px 4px;border-bottom:1px solid var(--line);text-decoration:none;color:var(--portal-heading);font-family:'Cormorant Garamond','Amiri',serif;font-size:1.05rem;font-weight:600;transition:padding-inline-start .2s ease,color .2s ease;}
  .office-index-row:hover{padding-inline-start:12px;color:var(--gold-bright);}
</style>
</head>
<body class="portal-body">
<div class="portal-topbar">
  <a class="portal-brand" href="/">
    <img src="/assets/images/brand-mark.png" alt="Sultan Hanafi Royal Schools crest" />
    <span>Sultan Hanafi</span>
  </a>
  <a class="portal-topbar-link" href="/portal/staff/login/">Staff Sign In</a>
  <span class="lang-switch-mount" data-locale-switcher></span>
</div>
<main class="portal-main" style="align-items:flex-start;">
  <div class="office-index-wrap">
    <p class="portal-aside-eyebrow" style="color:var(--gold);">INSTITUTIONAL PORTAL ECOSYSTEM</p>
    <h1 style="font-family:'Cormorant Garamond','Amiri',serif;font-size:2.1rem;color:var(--portal-heading);margin:6px 0 8px;" data-i18n="portal.allOffices">All Offices</h1>
    <p style="color:var(--ink-soft);max-width:640px;margin-bottom:8px;">Every office in the Sultan Hanafi Royal Schools digital campus, grouped by layer. Offices without a confirmed appointment show an honest "Vacant &mdash; Awaiting Appointment" seat, not a fabricated name.</p>
    <p style="margin-bottom:8px;"><a href="/portal/staff/org-chart/" style="color:var(--gold-bright,var(--gold));font-weight:600;">Organisational Chart &rarr;</a></p>
    <p style="margin-bottom:28px;"><a href="/portal/admin/centre/" style="color:var(--gold-bright,var(--gold));font-weight:600;">Institutional Administration Centre &rarr;</a> <span style="color:var(--ink-soft);font-size:0.82rem;">(sysadmin token required)</span></p>
${layerBlocks}
  </div>
</main>
<script src="/js/portal-office-switcher.js" defer></script>
<script src="/js/prestige.js" defer></script>
<script src="/js/motion.js" defer></script>
<script src="/js/hijri.js" defer></script>
<script src="/js/portal-chrome.js" defer></script>
<script src="/js/footer-live.js" defer></script>
<script src="/js/clock.js" defer></script>
</body>
</html>
`;
}

function main() {
  let written = 0;
  for (const office of OFFICES) {
    const dir = path.join(ROOT, 'portal', 'office', office.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(office));
    written++;
  }

  const layerLabels = {
    governance: 'Governance', academic: 'Academic', school_leadership: 'School Leadership',
    operational: 'Operational', institutional_services: 'Institutional Services',
  };
  const byLayer = {};
  for (const office of OFFICES) {
    (byLayer[office.layer] = byLayer[office.layer] || []).push(office);
  }
  const indexDir = path.join(ROOT, 'portal', 'staff', 'offices');
  fs.mkdirSync(indexDir, { recursive: true });
  fs.writeFileSync(path.join(indexDir, 'index.html'), directoryIndexHtml(byLayer, layerLabels));

  console.log(`built ${written} office portal page(s) + 1 directory index`);
}

main();
