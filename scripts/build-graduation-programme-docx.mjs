#!/usr/bin/env node
/**
 * The Word edition of the Graduation Ceremony Programme — the same trifold.
 *
 *     node scripts/build-graduation-programme-docx.mjs
 *
 * Two landscape sheets, each set in three columns with a column break between
 * panels: fold twice and it reads in the same order as the press file. The PDF
 * is the design-true artefact — it bleeds to the trim and carries the dark
 * ceremonial cover, the engine-turned bands and the school's own typefaces.
 * This is the editable one, set in faces that are on every machine that opens
 * a .docx, so the office can change a time or add a name on the morning
 * without a build step.
 *
 * Names, running order, guests and officers are IMPORTED from the builder that
 * makes the PDF. There is no second list to fall out of step with the first.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  AlignmentType, BorderStyle, ColumnBreak, Document, ImageRun, Packer,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import {
  AWARDS, ORDER, OFFICERS, TOTAL, PEOPLE, COORDINATORS, VENUE, WEB, MAIL, TEL,
  CHIEF_HOST, LECTURE, GUESTS, FIGURES, WELCOME, CEO_WORD, TAGLINE, OPENS, CLOSES, to12,
  OFFICER_FACE,
} from './build-graduation-programme.mjs';

// ── Typefaces ───────────────────────────────────────────────────────────────
// Cormorant, Cinzel and Amiri are web fonts; Word cannot be relied on to have
// them, and a document that substitutes silently looks worse than one set in a
// typeface chosen on purpose. Cambria ships with Office on Windows and macOS,
// and Times New Roman is the one face that is everywhere AND shapes Arabic
// correctly — which matters more here than a preference between serifs.
const SERIF = 'Cambria';
const SANS = 'Calibri';
const ARABIC = 'Times New Roman';

const INK = '2B2417', SOFT = '5A4E37', GOLD = '7A5C21', GOLD_L = 'A8863F';
const DARK = '241A0B', CREAM = 'F3E7CC', TINT = 'F7F2E6';

const MM = (mm) => Math.round(mm * 56.6929);   // millimetres → DXA
const PX = (mm) => Math.round(mm * 96 / 25.4); // millimetres → CSS px, for images

// A4 landscape, three panels. No bleed: an office printer cannot bleed, and a
// panel drawn to a false trim would be cropped wrong on the fold.
const SHEET_W = 297, SHEET_H = 210;
const MARGIN = { top: MM(9), bottom: MM(8), left: MM(8), right: MM(8) };
const GUTTER = 8;                                  // mm between columns
const COL = (SHEET_W - 16 - GUTTER * 2) / 3;       // 88.3mm

const img = (dir, file, wMm, hMm) => new ImageRun({
  data: readFileSync(`assets/images/${dir}/${file}`),
  type: file.endsWith('.png') ? 'png' : 'jpg',
  transformation: { width: PX(wMm), height: PX(hMm) },
});

const p = (opts) => new Paragraph(opts);

const line = (text, o = {}) => p({
  alignment: o.align ?? AlignmentType.CENTER,
  spacing: { before: o.before ?? 0, after: o.after ?? 0 },
  children: [new TextRun({
    text, font: o.font ?? SERIF, size: o.size ?? 16, color: o.color ?? INK,
    bold: o.bold, italics: o.italics, allCaps: o.caps, characterSpacing: o.track,
  })],
});

const arabic = (text, o = {}) => p({
  alignment: o.align ?? AlignmentType.CENTER,
  spacing: { before: o.before ?? 0, after: o.after ?? 0 },
  children: [new TextRun({
    text, font: ARABIC, size: o.size ?? 20, color: o.color ?? GOLD,
    rightToLeft: true, bold: o.bold,
  })],
});

const rule = (o = {}) => p({
  spacing: { before: o.before ?? 100, after: o.after ?? 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: o.heavy ? 8 : 4, color: GOLD_L, space: 3 } },
  children: [new TextRun({ text: '', size: 2 })],
});

// A panel heading: the kicker, the title, a rule under both.
const head = (kicker, title) => [
  line(kicker, { size: 10, font: SANS, color: SOFT, caps: true, track: 60, after: 40 }),
  line(title, { size: 22, bold: true, color: GOLD, caps: true, track: 20 }),
  rule({ before: 60, after: 120 }),
];

// A section heading: gold small caps over a hairline.
const sh = (text, o = {}) => p({
  spacing: { before: o.before ?? 180, after: o.after ?? 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD_L, space: 3 } },
  children: [new TextRun({
    text, font: SANS, size: 11, color: GOLD, allCaps: true, bold: true, characterSpacing: 50,
  })],
});

// A photograph with its caption in gold small caps beneath.
const plate = (file, wMm, hMm, cap) => [
  p({ alignment: AlignmentType.CENTER, children: [img('gallery', file, wMm, hMm)] }),
  p({
    alignment: AlignmentType.CENTER, spacing: { before: 20, after: 120 },
    children: [new TextRun({
      text: cap, font: SANS, size: 9, color: GOLD, allCaps: true, characterSpacing: 30,
    })],
  }),
];

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

const cell = (children, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  margins: { top: o.pad ?? 30, bottom: o.pad ?? 30, left: o.padX ?? 0, right: o.padX ?? 40 },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  children,
});

const grid = (widths, rows) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths, borders: NO_BORDER, rows,
});

const CW = MM(COL);
const brk = () => p({ children: [new ColumnBreak()] });

const HONORIFIC = /^(dr|mr|mrs|ms|imam|shaykh|sheikh|alfa|ustadh|ustādh|prof)\.?$/i;
const initials = (name) => name.split(/\s+/).filter((w) => !HONORIFIC.test(w))
  .slice(0, 2).map((w) => w[0]).join('');

const byCode = Object.fromEntries(AWARDS.map((a) => [a.code, a]));

// A roll: the stage in Arabic above, the award below, then the names.
const roll = (a) => [
  ...(a.ar ? [p({
    spacing: { before: 140, after: 0 }, keepNext: true,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD_L, space: 5 } },
    children: [new TextRun({ text: a.ar, font: ARABIC, size: 16, color: GOLD_L, rightToLeft: true })],
  })] : []),
  p({
    spacing: { before: a.ar ? 0 : 140, after: 0 }, keepNext: true,
    border: a.ar ? undefined
      : { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD_L, space: 5 } },
    children: [new TextRun({ text: a.title, font: SERIF, size: 17, bold: true, color: GOLD })],
  }),
  p({
    spacing: { after: 60 }, keepNext: true,
    children: [new TextRun({
      text: a.school, font: SANS, size: 9, color: SOFT, allCaps: true, characterSpacing: 20,
    })],
  }),
  ...a.names.map((n, i) => p({
    spacing: { before: 8, after: 8 }, indent: { left: 170, hanging: 130 },
    children: [
      new TextRun({ text: `${i + 1}.  `, font: SANS, size: 11, color: GOLD_L }),
      new TextRun({ text: n, font: SERIF, size: 17, color: INK }),
    ],
  })),
];

// ── PANEL · THE WELCOME ─────────────────────────────────────────────────────
const panelWelcome = [
  ...plate('commissioning-day-1.jpg', COL, 48,
    'The Founder with a pupil · Commissioning Day'),
  ...head('Sultan Hanafi Royal Schools', 'A Word of Welcome'),
  p({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 },
    children: [
      new TextRun({ text: 'O', font: SERIF, size: 26, bold: true, color: GOLD }),
      new TextRun({ text: WELCOME[0], font: SERIF, size: 16, color: INK }),
    ],
  }),
  p({
    spacing: { before: 60, after: 100 }, indent: { left: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } },
    children: [new TextRun({ text: LECTURE.title, font: SERIF, size: 18, italics: true, color: GOLD })],
  }),
  p({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 70 },
    children: [new TextRun({ text: WELCOME[1], font: SERIF, size: 16, color: INK })],
  }),
  p({
    alignment: AlignmentType.RIGHT, spacing: { after: 140 },
    children: [new TextRun({
      text: 'The Board of Trustees', font: SANS, size: 10, color: SOFT,
      allCaps: true, characterSpacing: 50,
    })],
  }),
  rule({ before: 0, after: 70 }),
  grid([Math.round(CW / 2), Math.round(CW / 2)], [0, 2].map((k) => new TableRow({
    children: [FIGURES[k], FIGURES[k + 1]].map(([n, l]) => cell([
      p({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: n, font: SERIF, size: 22, bold: true, color: GOLD })],
      }),
      p({
        alignment: AlignmentType.CENTER, spacing: { before: 20 },
        children: [new TextRun({
          text: l, font: SANS, size: 9, color: SOFT, allCaps: true, characterSpacing: 20,
        })],
      }),
    ], Math.round(CW / 2), { pad: 20, padX: 20 })),
  }))),
  rule({ before: 70, after: 140 }),
  grid([CW], [new TableRow({
    children: [cell([
      p({
        spacing: { after: 70 },
        children: [new TextRun({
          text: 'A Word from the Chief Executive Director', font: SANS, size: 10,
          color: 'D8BC7C', bold: true, allCaps: true, characterSpacing: 50,
        })],
      }),
      ...CEO_WORD.map((t) => p({
        alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 },
        children: [new TextRun({ text: t, font: SERIF, size: 15, color: CREAM })],
      })),
      p({
        alignment: AlignmentType.RIGHT, spacing: { before: 50 },
        children: [new TextRun({ text: CHIEF_HOST[0], font: SERIF, size: 17, bold: true, color: 'FBF3E1' })],
      }),
      p({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({
          text: CHIEF_HOST[2], font: SANS, size: 9, color: 'D8BC7C',
          allCaps: true, characterSpacing: 40,
        })],
      }),
    ], CW, { fill: DARK, pad: 120, padX: 140 })],
  })]),
];

// ── PANEL · THE BACK ────────────────────────────────────────────────────────
const panelBack = [
  p({
    alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 },
    children: [img('crests', 'shrs-institutional-crest.png', 20 * (520 / 476), 20)],
  }),
  arabic('مدارس السلطان حنفي الملكية', { size: 20, after: 60 }),
  line('Sultan Hanafi Royal Schools', { size: 21, bold: true, color: GOLD, caps: true, track: 40 }),
  line('Established MMXVII · Ikorodu · Lagos State',
    { size: 9, font: SANS, color: SOFT, caps: true, track: 40, before: 60 }),
  rule({ before: 120, after: 80 }),
  line(TAGLINE, { size: 18, italics: true, color: GOLD, after: 60 }),
  sh('Presiding and Officiating'),
  ...OFFICERS.map(([n, ar, r]) => grid([MM(13), CW - MM(13)], [new TableRow({
    children: [
      cell([p({
        children: OFFICER_FACE[n] ? [img('leadership', OFFICER_FACE[n], 11, 11)]
          : [new TextRun({ text: initials(n), font: SERIF, size: 20, bold: true, color: GOLD })],
      })], MM(13), { pad: 40, padX: 0 }),
      cell([
        // Arabic above, English below — never the other way round.
        ...(ar ? [p({
          children: [new TextRun({ text: ar, font: ARABIC, size: 15, color: GOLD, rightToLeft: true })],
        })] : []),
        p({ children: [new TextRun({ text: n, font: SERIF, size: 16, bold: true })] }),
        p({
          spacing: { before: 20 },
          children: [new TextRun({
            text: r, font: SANS, size: 8, color: SOFT, allCaps: true, characterSpacing: 10,
          })],
        }),
      ], CW - MM(13), { pad: 40, padX: 0 }),
    ],
  })])),
  sh('The Four Schools'),
  ...[
    ['Nursery and Primary School', 'Ages 2 to 10', ''],
    ['Royal College', 'Junior and Senior Secondary', ''],
    ['School of Islamic and Arabic Studies', '', 'قسم الدراسات الإسلامية والعربية'],
    ['Qur’an College', '', 'كلية السلطان حنفي للقرآن'],
  ].flatMap(([n, sub, ar]) => [
    line(n, { size: 16, bold: true, before: 60 }),
    ...(sub ? [line(sub, { size: 8, font: SANS, color: SOFT, caps: true, track: 30 })] : []),
    ...(ar ? [arabic(ar, { size: 14 })] : []),
  ]),
  rule({ before: 160, after: 80 }),
  line('Every certificate is verifiable.', { size: 14, bold: true, color: GOLD, after: 50 }),
  p({
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({
      text: 'Each carries a certificate number, a verification code and a QR code '
        + 'registered with the Office of the Registrar — scan the code, or enter '
        + `the number at ${WEB}/verify-certificate.`,
      font: SERIF, size: 14, color: SOFT, italics: true,
    })],
  }),
  line(VENUE, { size: 9, font: SANS, color: SOFT, track: 10, after: 40 }),
  line(`${WEB} · ${MAIL} · ${TEL}`, { size: 9, font: SANS, color: SOFT, track: 10, after: 120 }),
  arabic('القرآن يعلو ولا يعلى', { size: 19, color: GOLD }),
];

// ── PANEL · THE COVER ───────────────────────────────────────────────────────
const panelCover = [
  ...plate('campus-building.jpg', COL, 56, 'The campus at Imowonla Road'),
  p({
    alignment: AlignmentType.CENTER, spacing: { before: 100, after: 70 },
    children: [img('crests', 'shrs-institutional-crest.png', 21 * (520 / 476), 21)],
  }),
  arabic('مدارس السلطان حنفي الملكية', { size: 19, after: 60 }),
  line('Sultan Hanafi Royal Schools', { size: 20, bold: true, color: GOLD, caps: true, track: 40 }),
  line('Established MMXVII · Ikorodu · Lagos',
    { size: 9, font: SANS, color: SOFT, caps: true, track: 40, before: 50 }),
  rule({ before: 150, after: 150, heavy: true }),
  line('The First Combined', { size: 17, italics: true, color: SOFT, after: 90 }),
  line('Graduation', { size: 40, bold: true, caps: true, track: 20 }),
  line('Ceremony', { size: 40, bold: true, caps: true, track: 20, after: 120 }),
  line('Class of 2026', { size: 15, color: GOLD, caps: true, track: 160, after: 60 }),
  rule({ before: 150, after: 150, heavy: true }),
  line('Saturday, 8 August 2026', { size: 20, bold: true, after: 60 }),
  arabic('٢٥ صفر ١٤٤٨هـ', { size: 18, after: 60 }),
  line(`${to12(OPENS)} – ${to12(CLOSES)} · School Grounds`,
    { size: 9, font: SANS, color: SOFT, caps: true, track: 30, after: 180 }),
  line(TAGLINE, { size: 17, italics: true, color: GOLD, after: 70 }),
  line(`${TOTAL} awards · ${PEOPLE} graduands · four schools`,
    { size: 9, font: SANS, color: SOFT, caps: true, track: 40 }),
];

// ── PANEL · THE ORDER ───────────────────────────────────────────────────────
const TIME_W = MM(22);
const panelOrder = [
  ...plate('islamic-prayer-hall.jpg', COL, 34, 'The Prayer Hall'),
  ...head('The Order of the Day', 'Order of Proceedings'),
  grid([TIME_W, CW - TIME_W], ORDER.map(([a, b, t, s], i) => {
    const ar = s && /[؀-ۿ]/.test(s);
    return new TableRow({
      children: [
        cell([p({
          spacing: { before: 22, after: 22 },
          children: [new TextRun({
            text: `${a}–${b}`, font: SANS, size: 10, color: GOLD, bold: true,
          })],
        })], TIME_W, { fill: i % 2 ? undefined : TINT, padX: 40 }),
        cell([
          p({
            spacing: { before: 18, after: s ? 0 : 18 },
            children: [new TextRun({ text: t, font: SERIF, size: 16, color: INK })],
          }),
          ...(s ? [p({
            spacing: { after: 18 },
            children: ar
              ? [new TextRun({ text: s, font: ARABIC, size: 15, color: GOLD, rightToLeft: true })]
              : [new TextRun({ text: s, font: SANS, size: 10, color: SOFT, italics: true })],
          })] : []),
        ], CW - TIME_W, { fill: i % 2 ? undefined : TINT, padX: 40 }),
      ],
    });
  })),
  line('Programme Coordinators',
    { size: 9, font: SANS, color: GOLD, caps: true, track: 70, before: 140, after: 40 }),
  line(COORDINATORS, { size: 16, after: 60 }),
  sh('Distinguished Guests'),
  ...GUESTS.flatMap(([n, r]) => [
    p({
      spacing: { before: 50, after: r ? 0 : 50 },
      children: [new TextRun({ text: n, font: SERIF, size: 16, bold: true })],
    }),
    ...(r ? [p({
      spacing: { after: 50 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'DDD2B7', space: 2 } },
      children: [new TextRun({
        text: r, font: SANS, size: 8, color: SOFT, allCaps: true, characterSpacing: 10,
      })],
    })] : []),
  ]),
];

// ── PANELS · THE GRADUANDS ──────────────────────────────────────────────────
const panelRollA = [
  ...head('Class of 2026', 'The Graduands'),
  p({
    alignment: AlignmentType.CENTER, spacing: { after: 90 },
    children: [new TextRun({
      text: 'Each graduand named here has completed the requirements of their '
        + 'programme and is admitted to the award beneath their school. One who '
        + 'has completed two programmes is named under each.',
      font: SERIF, size: 14, color: SOFT, italics: true,
    })],
  }),
  ...['QUR', 'IBT', 'IDD', 'PRY'].flatMap((c) => roll(byCode[c])),
];

const panelRollB = [
  ...head('Class of 2026', 'The Graduands · continued'),
  ...['JSS', 'SS'].flatMap((c) => roll(byCode[c])),
  sh('The Chief Host'),
  grid([MM(17), CW - MM(17)], [new TableRow({
    children: [
      cell([p({ children: [img('leadership', 'founder-ceo.jpg', 15, 15)] })],
        MM(17), { pad: 40, padX: 0 }),
      cell([
        p({ children: [new TextRun({ text: CHIEF_HOST[1], font: ARABIC, size: 16, color: GOLD, rightToLeft: true })] }),
        p({ children: [new TextRun({ text: CHIEF_HOST[0], font: SERIF, size: 18, bold: true })] }),
        p({
          spacing: { before: 20 },
          children: [new TextRun({
            text: CHIEF_HOST[2], font: SANS, size: 9, color: SOFT,
            allCaps: true, characterSpacing: 30,
          })],
        }),
      ], CW - MM(17), { pad: 40, padX: 0 }),
    ],
  })]),
  sh('The Lecture'),
  p({ children: [new TextRun({ text: `“${LECTURE.title}”`, font: SERIF, size: 16, italics: true, color: GOLD })] }),
  p({
    spacing: { before: 50, after: 160 },
    children: [new TextRun({ text: LECTURE.by, font: SERIF, size: 17, bold: true })],
  }),
  ...plate('quran-recitation-1.jpg', COL, 30, 'Qur’an Recitation'),
];

// ── The document ────────────────────────────────────────────────────────────
// One section per printed side, three columns each, a column break between
// panels. Fold twice and the sequence comes out cover → welcome → inside.
const sheet = (panels) => ({
  properties: {
    page: { size: { width: MM(SHEET_W), height: MM(SHEET_H) }, margin: MARGIN },
    column: { count: 3, space: MM(GUTTER), equalWidth: true },
  },
  children: [panels[0], brk(), panels[1], brk(), panels[2]].flat(),
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS Graduation Ceremony 2026 — Trifold Programme',
  description: 'Order of proceedings and the roll of graduands, 8 August 2026. '
    + `${TOTAL} awards conferred upon ${PEOPLE} graduands.`,
  styles: { default: { document: { run: { font: SERIF, size: 16, color: INK } } } },
  sections: [
    sheet([panelWelcome, panelBack, panelCover]),
    sheet([panelOrder, panelRollA, panelRollB]),
  ],
});

const out = 'dist/graduation-programme/SHRS-Graduation-Programme-2026.docx';
const buf = await Packer.toBuffer(doc);
writeFileSync(out, buf);
console.log(`\n  ${out}  ${(buf.length / 1024).toFixed(0)} KB`);
console.log(`  trifold · 2 sheets of 3 columns · ${COL.toFixed(1)}mm panels`);
console.log(`  ${TOTAL} awards · ${PEOPLE} graduands · ${GUESTS.length} distinguished guests\n`);
