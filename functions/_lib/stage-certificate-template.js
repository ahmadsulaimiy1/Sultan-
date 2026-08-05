// Academic Stage Certificate — bilingual rendered document (Certificate
// Generation Directive, 2026-08-05). A faithful institutional rebuild of
// the client's Canva "Ibtida'iyyah certificate" design: ONE A4
// LANDSCAPE page carrying BOTH languages (Arabic right-anchored, English
// left-anchored), Registrar + Head of School signatories, dual
// Gregorian/Hijri date line, and the void-if-altered clause in both
// languages — upgraded with the identifier/verification apparatus the
// directive mandates (permanent Student ID, long anti-forgery serial,
// QR verification, HMAC display hash).
//
// Deliberately a SEPARATE module from document-template-shell.js: that
// shell is a portrait, single-language frame for the graduation-document
// family; this is a landscape, single-page, dual-language ceremonial
// document with its own composition. It SHARES the Design System v4
// palette, fonts, and heraldic assets (crests, girih band concept) so
// both families read as one institution — divergence is layout, never
// brand.
//
// Every field below is real data passed in from a stage_certificates
// row — nothing is improvised at render time, so the printed document
// always matches what the public verifier will attest to.

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Arabic grammatical forms keyed off the roster's sex field — the same
// male/female wording the client's own Canva original uses (لإتمامه /
// وحصوله with الطالب). Unknown sex falls back to the masculine
// convention Arabic documents conventionally default to.
function arForms(sex) {
  if (String(sex || '').toLowerCase() === 'female') {
    return { student: 'الطالبة', completion: 'لإتمامها', achieving: 'وحصولها' };
  }
  return { student: 'الطالب', completion: 'لإتمامه', achieving: 'وحصوله' };
}

function formatGregorianEn(isoDate) {
  const d = new Date(String(isoDate).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return String(isoDate);
  const day = d.getUTCDate();
  const ordinal = (n) => {
    if (n % 100 >= 11 && n % 100 <= 13) return 'th';
    return ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th';
  };
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${day}${ordinal(day)} ${months[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}

function formatGregorianAr(isoDate) {
  const d = new Date(String(isoDate).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return String(isoDate);
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}م`;
}

// Single certificate → complete standalone HTML document.
// `cert` is a stage_certificates row (snake_case, exactly as stored);
// `qrSvgMarkup` is the pre-rendered verification QR (functions/_lib/
// qrcode.js); `verifyUrl` is the full public verification address the
// QR encodes, printed beside it for verifiers typing by hand.
export function renderStageCertificate({ cert, qrSvgMarkup, verifyUrl }) {
  const title = `${cert.programme_label_en || 'Stage'} Certificate — ${cert.student_full_name}`;
  return docShell(title, sheetHtml({ cert, qrSvgMarkup, verifyUrl }));
}

// Bulk print document — every certificate of a batch as one multi-page
// A4-landscape document (one .sheet per page, page-break-after each), so
// a whole cohort prints or exports to PDF in a single pass.
export function renderStageCertificateBatch(title, items) {
  return docShell(title, items.map(sheetHtml).join('\n'));
}

function sheetHtml({ cert, qrSvgMarkup, verifyUrl }) {
  const ar = arForms(cert.student_sex);
  const displayHash = String(cert.content_hash || '').slice(0, 12).toUpperCase();
  const gregEn = formatGregorianEn(cert.issued_at);
  const gregAr = formatGregorianAr(cert.issued_at);
  const hijriEn = cert.issued_at_hijri || '';
  const hijriAr = cert.issued_at_hijri_ar || '';
  const nameEn = escapeHtml(cert.student_full_name);
  const nameAr = escapeHtml(cert.student_full_name_ar || '');
  const gradeEn = escapeHtml(cert.grade_en || '');
  const gradeAr = escapeHtml(cert.grade_ar || cert.grade_en || '');
  const placeEn = escapeHtml(cert.place_en || 'Ikorodu, Lagos State, Nigeria');
  const placeAr = escapeHtml(cert.place_ar || 'مدينة إكورودو، ولاية لاغوس، نيجيريا');
  const serial = escapeHtml(cert.serial_no);
  const studentId = escapeHtml(cert.student_identity_no || '—');
  const academicYear = escapeHtml(cert.academic_year);
  const stageEn = escapeHtml(cert.programme_label_en || '');
  const stageAr = escapeHtml(cert.programme_label_ar || '');

  return `<div class="sheet">
  <div class="frame-outer"></div>
  <div class="frame-band"></div>
  <div class="frame-gold"></div>
  <div class="frame-inner"></div>

  <div class="corner tl">${cornerOrnament()}</div>
  <div class="corner tr">${cornerOrnament()}</div>
  <div class="corner br">${cornerOrnament()}</div>
  <div class="corner bl">${cornerOrnament()}</div>

  <div class="watermark"><img src="/assets/images/crest-watermark.png" alt="" /></div>

  <div class="inner">
    <div class="masthead">
      <div class="crest"><img src="/assets/images/crests/nigeria-coat-of-arms.png" alt="Federal Republic of Nigeria" /></div>
      <div class="masthead-centre">
        <div class="state-line">جمهورية نيجيريا الاتحادية
          <span class="en">Federal Republic of Nigeria</span>
        </div>
        <div class="inst-ar">مدارس السلطان حنفي الملكية</div>
        <div class="inst-en">Sultan Hanafi Royal Schools</div>
        <div class="school-line">School of Islamic and Arabic Studies</div>
        <div class="school-line-ar">مدرسة الدراسات الإسلامية والعربية</div>
      </div>
      <div class="crest"><img src="/assets/images/crests/shrs-institutional-crest.png" alt="Sultan Hanafi Royal Schools" /></div>
    </div>

    <div class="rule"><div class="line"></div><div class="diamond"></div><div class="line"></div></div>

    <div class="title-block">
      <div class="title-ar">شهادة إتمام ${stageAr}</div>
      <div class="title-en">Certificate of Completion — ${stageEn}</div>
      <div class="title-sub">Academic Year ${academicYear} — العام الدراسي ${academicYear}</div>
    </div>

    <div class="recipient">
      <div class="awarded-line">
        <span class="en">This certificate is awarded to</span>
        <span class="ar">تُمنح هذه الشهادة إلى</span>
      </div>
      <div class="name-ar">${ar.student}: ${nameAr}</div>
      <div class="name-en">${nameEn}</div>
      <div class="name-underline"></div>
    </div>

    <div class="id-strip">
      <div class="id-chip"><div class="k">Student ID — الرقم الأكاديمي الدائم</div><div class="v">${studentId}</div></div>
      <div class="id-chip"><div class="k">Certificate Serial No — الرقم التسلسلي للشهادة</div><div class="v">${serial}</div></div>
    </div>

    <div class="citation">
      <div class="cite en">
        For successfully completing the requirements of <strong>${stageEn}</strong>
        and achieving a grade of <span class="grade">${gradeEn}</span> in the Islamic and Arabic subjects,
        as per the School&rsquo;s approved curriculum, in ${placeEn}.
        <span class="datesline">Issued on <strong>${gregEn}</strong>${hijriEn ? `, corresponding to <strong>${escapeHtml(hijriEn)}</strong>` : ''}.</span>
      </div>
      <div class="cite ar">
        وذلك ${ar.completion} متطلبات <strong>${stageAr}</strong> بنجاح، ${ar.achieving} على تقدير:
        <span class="grade">${gradeAr}</span> في مواد الدراسات الإسلامية والعربية وفق المناهج المعتمدة لدى المدرسة،
        في ${placeAr}.
        <span class="datesline">حُررت هذه الشهادة بتاريخ <strong>${gregAr}</strong>${hijriAr ? ` الموافق <strong>${escapeHtml(hijriAr)}</strong>` : ''}.</span>
      </div>
    </div>

    <div class="execution">
      <div class="sig">
        <div class="line"></div>
        <div class="role-en">Registrar</div>
        <div class="role-ar">المسجّلة</div>
      </div>
      <div class="verify-block">
        <div class="qr">${qrSvgMarkup || ''}</div>
        <div class="verify-caption">Scan to verify — امسح للتحقق</div>
        <div class="verify-url">${escapeHtml(verifyUrl || '')}</div>
      </div>
      <div class="sig">
        <div class="line"></div>
        <div class="role-en">Head of the School</div>
        <div class="role-ar">رئيس المدرسة</div>
      </div>
    </div>

    <div class="security">
      <div class="void-note">
        <span class="ar">أي تعديل أو تغيير يجعل هذه الشهادة لاغية</span>
        <span class="en">Any alteration or modification renders this certificate void.</span>
      </div>
      <div class="hash-line">
        Document Integrity (HMAC-SHA-256): <b>${displayHash}</b><br/>
        Verified live against the official Sultan Hanafi Royal Schools certificate database.
      </div>
    </div>
  </div>
</div>`;
}

function docShell(title, sheetsHtml) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    /* Design System v4 palette — shared with document-template-shell.js
       so every SHRS credential reads as one institution. */
    --espresso:#221A10; --coffee:#4B3420; --gold:#9C7A35; --gold-soft:#C9A356;
    --champagne:#E4D0A0; --ivory:#FBF4E4; --cream:#F2E6CC; --warm-white:#FCF8F0;
    --teal:#0F5C57; --teal-wash:rgba(15,92,87,0.07); --oxblood:#6E1F2B;
    --font-display:'Cormorant Garamond',serif;
    --font-hero:'Playfair Display',serif;
    --font-label:'Cinzel',serif;
    --font-body:'Inter',sans-serif;
    --font-ar-display:'Amiri',serif;
    --font-ar-body:'Cairo',sans-serif;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4 landscape;margin:0;}
  html,body{background:#DED5C2;}
  body{font-family:var(--font-body);color:var(--espresso);-webkit-print-color-adjust:exact;print-color-adjust:exact;}

  .sheet{
    position:relative;width:297mm;height:209.5mm;margin:0 auto;background:var(--ivory);
    overflow:hidden;page-break-after:always;
  }
  @media screen{ .sheet{margin:24px auto;box-shadow:0 24px 60px rgba(34,26,16,.35);} }

  /* Layered ceremonial frame: outer gold rule, girih-toned teal band,
     inner hairlines — the same three-layer border language as the v4
     shell, composed for landscape. */
  .frame-outer{position:absolute;inset:6mm;border:1.6px solid var(--gold);}
  .frame-band{position:absolute;inset:8mm;border:4.5mm solid var(--teal);
    border-image:repeating-linear-gradient(45deg,var(--teal) 0 6px,#0C4A46 6px 12px, var(--teal) 12px 14px) 1;}
  .frame-gold{position:absolute;inset:13.5mm;border:1px solid var(--gold-soft);}
  .frame-inner{position:absolute;inset:14.6mm;border:.5px solid rgba(156,122,53,.55);}

  .corner{position:absolute;width:16mm;height:16mm;pointer-events:none;}
  .corner svg{width:100%;height:100%;display:block;}
  .corner.tl{top:9.5mm;left:9.5mm;}
  .corner.tr{top:9.5mm;right:9.5mm;transform:rotate(90deg);}
  .corner.br{bottom:9.5mm;right:9.5mm;transform:rotate(180deg);}
  .corner.bl{bottom:9.5mm;left:9.5mm;transform:rotate(270deg);}

  .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.055;pointer-events:none;}
  .watermark img{width:120mm;height:auto;filter:sepia(.4);}

  .inner{position:absolute;inset:16mm 18mm;display:flex;flex-direction:column;}

  /* ── Masthead ─────────────────────────────────────────────── */
  .masthead{display:grid;grid-template-columns:28mm 1fr 28mm;align-items:center;column-gap:6mm;margin-top:1mm;}
  .masthead .crest{display:flex;align-items:center;justify-content:center;}
  .masthead .crest img{height:24mm;width:auto;object-fit:contain;}
  .masthead-centre{text-align:center;}
  .state-line{font-family:var(--font-ar-body);font-size:8.5pt;color:var(--coffee);letter-spacing:.4px;}
  .state-line .en{font-family:var(--font-label);font-size:6.8pt;text-transform:uppercase;letter-spacing:2.4px;display:block;margin-top:.6mm;}
  .inst-ar{font-family:var(--font-ar-display);font-size:21pt;font-weight:700;color:var(--espresso);line-height:1.25;margin-top:1.2mm;}
  .inst-en{font-family:var(--font-hero);font-size:14.5pt;font-weight:700;color:var(--espresso);letter-spacing:.6px;margin-top:.4mm;}
  .school-line{font-family:var(--font-label);font-size:8.6pt;letter-spacing:2.6px;text-transform:uppercase;color:var(--teal);margin-top:1.4mm;}
  .school-line-ar{font-family:var(--font-ar-display);font-size:11.5pt;color:var(--teal);margin-top:.4mm;}

  .rule{display:flex;align-items:center;gap:4mm;margin:2.6mm 0 0;}
  .rule .line{flex:1;height:.5px;background:linear-gradient(90deg,transparent,var(--gold) 18%,var(--gold) 82%,transparent);}
  .rule .diamond{width:2.4mm;height:2.4mm;background:var(--gold);transform:rotate(45deg);}

  /* ── Title ────────────────────────────────────────────────── */
  .title-block{text-align:center;margin-top:2.6mm;}
  .title-ar{font-family:var(--font-ar-display);font-size:15pt;font-weight:700;color:var(--coffee);}
  .title-en{font-family:var(--font-label);font-size:12.5pt;font-weight:600;letter-spacing:4.5px;text-transform:uppercase;color:var(--gold);margin-top:.8mm;}
  .title-sub{font-family:var(--font-display);font-style:italic;font-size:9.5pt;color:var(--coffee);margin-top:.8mm;}

  /* ── Recipient ───────────────────────────────────────────── */
  .recipient{text-align:center;margin-top:2.2mm;}
  .awarded-line{display:flex;justify-content:center;gap:14mm;font-size:8.6pt;color:var(--coffee);}
  .awarded-line .ar{font-family:var(--font-ar-body);font-weight:600;}
  .awarded-line .en{font-family:var(--font-label);letter-spacing:2px;text-transform:uppercase;}
  .name-ar{font-family:var(--font-ar-display);font-size:19pt;font-weight:700;color:var(--espresso);margin-top:1.2mm;direction:rtl;}
  .name-en{font-family:var(--font-hero);font-size:17pt;font-weight:700;color:var(--espresso);margin-top:.2mm;}
  .name-underline{width:120mm;height:.6px;margin:1.6mm auto 0;background:linear-gradient(90deg,transparent,var(--gold-soft) 12%,var(--gold) 50%,var(--gold-soft) 88%,transparent);}

  /* ── Identity strip ──────────────────────────────────────── */
  .id-strip{display:flex;justify-content:center;gap:5mm;margin-top:2mm;}
  .id-chip{border:.6px solid var(--gold-soft);background:var(--warm-white);padding:1.2mm 4mm;text-align:center;}
  .id-chip .k{font-family:var(--font-label);font-size:5.6pt;letter-spacing:1.6px;text-transform:uppercase;color:var(--teal);}
  .id-chip .v{font-family:var(--font-body);font-weight:600;font-size:8.2pt;color:var(--espresso);letter-spacing:.5px;margin-top:.4mm;}

  /* ── Bilingual citation ──────────────────────────────────── */
  .citation{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm;margin-top:2.6mm;flex:1;}
  .cite{line-height:1.62;color:var(--coffee);}
  .cite.en{font-family:var(--font-display);font-size:10.6pt;text-align:left;direction:ltr;}
  .cite.ar{font-family:var(--font-ar-display);font-size:11.6pt;line-height:1.75;text-align:right;direction:rtl;}
  .cite strong{color:var(--espresso);}
  .cite .grade{color:var(--oxblood);font-weight:700;}
  .cite .datesline{display:block;margin-top:1.6mm;font-size:.92em;}

  /* ── Signatures + QR ─────────────────────────────────────── */
  .execution{display:grid;grid-template-columns:1fr 44mm 1fr;align-items:end;column-gap:6mm;margin-top:2mm;}
  .sig{text-align:center;}
  .sig .line{width:52mm;height:.6px;background:var(--espresso);margin:0 auto;}
  .sig .role-en{font-family:var(--font-label);font-size:7.6pt;letter-spacing:1.8px;text-transform:uppercase;color:var(--espresso);margin-top:1.4mm;}
  .sig .role-ar{font-family:var(--font-ar-display);font-size:10.5pt;font-weight:700;color:var(--coffee);margin-top:.4mm;}
  .verify-block{text-align:center;padding-bottom:.5mm;}
  .verify-block .qr{width:20mm;height:20mm;margin:0 auto;background:#fff;padding:1.2mm;border:.6px solid var(--gold-soft);}
  .verify-block .qr svg{width:100%;height:100%;display:block;}
  .verify-caption{font-family:var(--font-label);font-size:5.4pt;letter-spacing:1.4px;text-transform:uppercase;color:var(--teal);margin-top:1mm;}
  .verify-url{font-family:var(--font-body);font-size:5.8pt;color:var(--coffee);margin-top:.5mm;word-break:break-all;}

  /* ── Security footer ─────────────────────────────────────── */
  .security{margin-top:1.8mm;border-top:.5px solid var(--gold-soft);padding-top:1.4mm;
    display:flex;justify-content:space-between;align-items:center;gap:6mm;}
  .void-note{font-size:6.6pt;color:var(--oxblood);}
  .void-note .ar{font-family:var(--font-ar-body);font-weight:600;display:block;direction:rtl;text-align:left;}
  .void-note .en{font-family:var(--font-body);display:block;margin-top:.3mm;}
  .hash-line{font-family:var(--font-body);font-size:5.9pt;color:var(--coffee);text-align:right;letter-spacing:.4px;}
  .hash-line b{color:var(--espresso);}

  @media print{
    html,body{background:var(--ivory);}
    .sheet{box-shadow:none;margin:0;width:297mm;height:209.5mm;}
  }
</style>
</head>
<body>
${sheetsHtml}
</body>
</html>`;
}

// Gold khatam-style corner ornament — an eight-point star with radiating
// strapwork, drawn as real geometry (matching the v4 shell's corner
// rosette language) rather than an image asset.
function cornerOrnament() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
    <path d="M8 8 H52 M8 8 V52" stroke="#9C7A35" stroke-width="2.4"/>
    <path d="M14 14 H44 M14 14 V44" stroke="#C9A356" stroke-width="1.2"/>
    <g transform="translate(30,30)">
      <path d="M0,-14 L3.6,-3.6 L14,0 L3.6,3.6 L0,14 L-3.6,3.6 L-14,0 L-3.6,-3.6 Z" fill="#9C7A35"/>
      <path d="M0,-8 L2.2,-2.2 L8,0 L2.2,2.2 L0,8 L-2.2,2.2 L-8,0 L-2.2,-2.2 Z" fill="#FBF4E4"/>
      <circle cx="0" cy="0" r="2.6" fill="#0F5C57"/>
    </g>
  </svg>`;
}
