// Institutional Correspondence letterhead — implements
// docs/letterhead-editorial-bible.md, which specifies this exact
// general-purpose stationery (letters, memos, circulars, notices,
// reports, minutes, appointment/warning/promotion letters, invitations,
// press releases, proposals — functions/_lib/correspondence-types.js)
// as a register deliberately distinct from document-template-shell.js's
// ceremonial certificate shell: "Institutional, tending Ceremonial" —
// masthead no more than 15% of the sheet as ONE horizontal band, motto
// moved to the foot, Deep Coffee Brown / Royal Gold / Warm Ivory only,
// calm in between. That bible existed before any code implemented it;
// this file is that implementation, carried over from the pattern
// proven correct while drafting a real resignation letter on this
// letterhead (measured pagination, print-media rendering, real crest
// asset, no fabricated signature imagery).
//
// Every office already has a row in `offices` (functions/api/portal/
// staff/office/[slug].js), but no office-specific crest/colour exists
// in the schema — only the institution has one real crest asset
// (assets/images/crest-full.png, the same file certificates and this
// shell both use; nothing here invents a second one). The office's own
// identity is carried the way the bible's masthead already makes room
// for: a small-caps label in the rail, exactly the way "Executive
// Management Team" read on the resignation letter this shell is built
// from.
//
// No signature image is ever drawn here. A signatory who has not
// personally supplied a real signature scan gets a signature LINE and
// a printed name — inventing a mark would violate the bible's "every
// mark must be true" rule (§I.3) the same way a fabricated seal would.

const CREST_URL = '/assets/images/crest-full.png';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const DOCUMENT_TYPE_LABEL = {
  letter: { en: 'Letter', ar: 'خطاب' },
  memo: { en: 'Internal Memorandum', ar: 'مذكرة داخلية' },
  circular: { en: 'Circular', ar: 'تعميم' },
  notice: { en: 'Notice', ar: 'إشعار' },
  report: { en: 'Report', ar: 'تقرير' },
  minutes: { en: 'Minutes of Meeting', ar: 'محضر اجتماع' },
  appointment_letter: { en: 'Letter of Appointment', ar: 'خطاب تعيين' },
  warning_letter: { en: 'Letter of Warning', ar: 'خطاب إنذار' },
  promotion_letter: { en: 'Letter of Promotion', ar: 'خطاب ترقية' },
  invitation: { en: 'Invitation', ar: 'دعوة' },
  press_release: { en: 'Press Release', ar: 'بيان صحفي' },
  proposal: { en: 'Proposal', ar: 'اقتراح' },
};

export function correspondenceTypeLabel(documentType, lang = 'en') {
  const entry = DOCUMENT_TYPE_LABEL[documentType];
  return entry ? (entry[lang] || entry.en) : (documentType || 'Document');
}

// The bible's "house spectrum" (docs/letterhead-editorial-bible.md
// §II-b) — the five institutions differentiate tonally within the same
// warm axis rather than getting five unrelated colours. Keyed by the
// exact institutions.dbName string (functions/_lib/institutions.js) so
// it can never silently drift from the one place institution identity
// is authored. Anything without a specific institution (a governance-
// or conglomerate-level office) gets Royal Gold, the neutral/primary
// accent — never a colour that implies a school it doesn't belong to.
//
// Used only where it sits on the light ivory sheet (the subject rule,
// the drop-cap), never on the dark masthead/rail — the bible's own
// spectrum runs light-to-dark, and its darkest members (Rich Walnut,
// Dark Cocoa) would be unreadable as text against a masthead that is
// already dark espresso. Nursery & Primary's literal Champagne
// (#E6D5B0) is likewise too close to the ivory paper itself to read as
// a rule/drop-cap there, so it's substituted with Antique Gold
// (#9C7A3C, one of the bible's own admitted "supporting" colours,
// §II-b) — same light end of the ramp, actually legible on cream.
const INSTITUTION_ACCENT = {
  'Nursery and Primary': '#9C7A3C',
  'Royal College': '#C6A15B',
  'Islamic and Arabic Studies': '#7A5A2E',
  "Qur'an College": '#4A2E1B',
  'Online and Distance Learning': '#241509',
};
const DEFAULT_ACCENT = '#C6A15B';

function accentForInstitution(institutionDbName) {
  return INSTITUTION_ACCENT[institutionDbName] || DEFAULT_ACCENT;
}

// bodyHtml is a sequence of already-built <p>...</p> (and, occasionally,
// <ol>/<ul>) blocks — the caller (the drafting endpoint, or a staff
// member's own edit) owns the prose; this function only ever wraps it.
export function renderCorrespondenceShell({
  officeName, institutionName = 'Sultan Hanafi Royal Schools',
  specificInstitutionName = null, accentInstitution = null,
  documentType = 'letter', lang = 'en', dir = 'ltr',
  dateDisplay, referenceNo, status = 'draft',
  recipientName, recipientRole, subject, bodyHtml,
  signatoryName, signatoryTitle,
}) {
  const typeLabel = correspondenceTypeLabel(documentType, lang);
  const accent = accentForInstitution(accentInstitution);
  const subOfficeLine = specificInstitutionName
    ? `<div class="mh-suboffice">${escapeHtml(specificInstitutionName)}</div>`
    : '';
  const isDraft = status !== 'issued';
  const draftStamp = isDraft
    ? `<div class="corr-draft-stamp">${lang === 'ar' ? 'مسودة — لم تصدر بعد' : 'DRAFT — NOT YET ISSUED'}</div>`
    : '';
  const refLine = referenceNo
    ? `<span>${lang === 'ar' ? 'الرقم المرجعي' : 'Ref'}: ${escapeHtml(referenceNo)}</span>`
    : `<span>${lang === 'ar' ? 'بلا رقم مرجعي (مسودة)' : 'No reference yet (draft)'}</span>`;
  const addressee = recipientName
    ? `<div class="addressee">
        <div class="to">${lang === 'ar' ? 'إلى' : 'To'}: ${escapeHtml(recipientName)}</div>
        ${recipientRole ? `<div>${escapeHtml(recipientRole)}</div>` : ''}
      </div>`
    : '';
  const subjectLine = subject
    ? `<div class="subject">${lang === 'ar' ? 'الموضوع' : 'Subject'}: ${escapeHtml(subject)}</div>`
    : '';
  const sigBlock = signatoryName
    ? `<div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-printed">${escapeHtml(signatoryName)}</div>
        ${signatoryTitle ? `<div class="sig-title">${escapeHtml(signatoryTitle)}</div>` : ''}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(typeLabel)} — ${escapeHtml(officeName || institutionName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Amiri:wght@400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --accent: ${accent}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif; color: #1C1207;
    background: radial-gradient(ellipse at 50% 12%, #4A3220 0%, #241609 100%);
  }
  .doc-page {
    width: 210mm; min-height: 297mm; margin: 10mm auto; position: relative;
    background: radial-gradient(ellipse at 50% 0%, #FDFAF3 0%, #F2EADC 100%);
    box-shadow: 0 20px 60px rgba(17,11,5,0.5);
  }
  .rail {
    position: absolute; left: 0; top: 0; bottom: 0; width: 7mm;
    background: linear-gradient(180deg,#2E1C10,#1A0F07);
  }
  .rail-label {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%,-50%) rotate(-90deg); transform-origin: center;
    white-space: nowrap; font-family: 'Inter'; font-weight: 600; font-size: 5pt;
    letter-spacing: 0.35em; color: #C6A15B; text-transform: uppercase;
  }
  .masthead {
    margin-left: 7mm; position: relative; height: 32mm;
    background: linear-gradient(120deg,#2E1C10 0%,#1A0F07 100%);
    clip-path: polygon(0 0, 100% 0, 100% 92%, 0% 100%);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 14mm 4mm 16mm; color: #F2EADC;
  }
  .mh-left { display: flex; align-items: center; gap: 6mm; }
  .crest { width: 20mm; height: 20mm; object-fit: contain; filter: drop-shadow(0 1mm 2mm rgba(0,0,0,.45)); }
  .mh-word {
    font-family: 'Cinzel'; font-weight: 800; font-size: 13.5pt; letter-spacing: 0.05em;
    background: linear-gradient(180deg,#FBF0D2,#E4C88C 40%,#B98F45 70%,#F2DFAF);
    -webkit-background-clip: text; background-clip: text; color: transparent; white-space: nowrap;
  }
  .mh-arabic { font-family: 'Amiri'; font-size: 10.5pt; direction: rtl; color: #E6D5B0; margin-top: 1mm; }
  .mh-right { text-align: right; flex: none; }
  .mh-office {
    font-family: 'Inter'; font-weight: 600; font-size: 8pt; letter-spacing: 0.1em;
    text-transform: uppercase; color: #C6A15B;
  }
  .mh-suboffice {
    font-family: 'Cormorant Garamond'; font-style: italic; font-weight: 500; font-size: 8.4pt;
    color: #E6D5B0; margin-top: 0.8mm;
  }
  .mh-nation {
    font-family: 'Inter'; font-weight: 400; font-size: 6.4pt; letter-spacing: 0.08em;
    text-transform: uppercase; color: #C9A45E; line-height: 1.85; margin-top: 1.5mm;
  }
  .sheet { margin-left: 7mm; padding: 12mm 16mm 6mm 16mm; position: relative; }
  .corr-draft-stamp {
    position: absolute; top: 40mm; right: 18mm; transform: rotate(-14deg);
    font-family: 'Cinzel'; font-weight: 700; font-size: 15pt; letter-spacing: 0.12em;
    color: rgba(122,46,62,0.28); border: 1.4pt solid rgba(122,46,62,0.28);
    padding: 2mm 6mm; pointer-events: none;
  }
  .ref-row { display: flex; justify-content: space-between; font-size: 9pt; color: #4A2E1B; margin-bottom: 6mm; }
  .addressee { font-size: 9.7pt; margin-bottom: 6mm; }
  .addressee .to { font-weight: 600; }
  .subject {
    font-family: 'Cinzel'; font-weight: 700; font-size: 10pt; letter-spacing: 0.05em;
    text-transform: uppercase; border-bottom: 0.5pt solid var(--accent); padding-bottom: 2.4mm; margin-bottom: 6mm;
  }
  .body p { font-size: 10.3pt; line-height: 1.68; text-align: justify; margin: 0 0 4.2mm 0; break-inside: avoid; }
  .body p:first-of-type::first-letter {
    font-family: 'Cinzel'; font-weight: 700; font-size: 22pt; color: var(--accent);
    float: left; line-height: 0.8; padding-right: 2mm; padding-top: 1mm;
  }
  .body ol, .body ul { font-size: 10.3pt; line-height: 1.68; margin: 0 0 4.2mm 0; padding-left: 6mm; }
  .body li { margin-bottom: 1.6mm; }
  .sig-block { margin-top: 12mm; break-inside: avoid; }
  .sig-line { width: 55mm; border-top: 0.6pt solid #4A2E1B; margin-top: 10mm; }
  .sig-printed { font-family: 'Inter'; font-weight: 600; font-size: 9.5pt; margin-top: 2mm; letter-spacing: 0.02em; }
  .sig-title { font-family: 'Inter'; font-weight: 400; font-size: 8.6pt; color: #4A2E1B; margin-top: 0.6mm; }
  .foot {
    margin-left: 7mm;
    background: linear-gradient(120deg,#1A0F07 0%,#2E1C10 100%);
    clip-path: polygon(0 8%, 100% 0, 100% 100%, 0 100%);
    color: #EDDCC0; padding: 6mm 14mm 5mm 16mm;
    display: flex; justify-content: space-between; align-items: flex-start;
    font-size: 7.6pt; line-height: 1.65;
  }
  .foot-col { display: flex; flex-direction: column; gap: 1.6mm; }
  .foot-item { display: flex; align-items: center; gap: 2.2mm; }
  .foot-item a { color: #EDDCC0; text-decoration: none; }
  .foot-motto { font-family: 'Cormorant Garamond'; font-style: italic; font-weight: 500; font-size: 10.5pt; color: #F2DFAF; }
  @media print {
    body { background: none; }
    .doc-page { margin: 0; box-shadow: none; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>
<div class="doc-page">
  <div class="rail"><div class="rail-label">${escapeHtml(institutionName)} ◆ ${escapeHtml(officeName || '')}</div></div>

  <div class="masthead">
    <div class="mh-left">
      <img class="crest" src="${CREST_URL}" alt="${escapeHtml(institutionName)} crest">
      <div>
        <div class="mh-word">${escapeHtml(institutionName.toUpperCase())}</div>
        <div class="mh-arabic">مدارس السلطان حنفي الملكية</div>
      </div>
    </div>
    <div class="mh-right">
      <div class="mh-office">${escapeHtml(officeName || '')}</div>
      ${subOfficeLine}
      <div class="mh-nation"><div>Ikorodu, Lagos State</div><div>Federal Republic of Nigeria</div></div>
    </div>
  </div>

  <div class="sheet">
    ${draftStamp}
    <div class="ref-row">
      <span>${lang === 'ar' ? 'التاريخ' : 'Date'}: ${escapeHtml(dateDisplay || '')}</span>
      ${refLine}
    </div>
    ${addressee}
    ${subjectLine}
    <div class="body">${bodyHtml || ''}</div>
    ${sigBlock}
  </div>

  <div class="foot">
    <div class="foot-col">
      <div class="foot-motto">Forming Scholars, Leaders and Guardians of Excellence.</div>
    </div>
    <div class="foot-col">
      <div class="foot-item">
        <span>15 Imowonla Road, AP Bus Stop, Off Gberigbe&ndash;Agura Road, Ikorodu, Lagos State</span>
      </div>
      <div class="foot-item"><a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a></div>
      <div class="foot-item"><a href="tel:+2348073747650">+234 807 374 7650</a></div>
      <div class="foot-item"><a href="https://shroyalschools.com">shroyalschools.com</a></div>
    </div>
  </div>
</div>
</body>
</html>`;
}
