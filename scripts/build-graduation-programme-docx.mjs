#!/usr/bin/env node
/**
 * The Word edition of the Graduation Ceremony Programme.
 *
 *     node scripts/build-graduation-programme-docx.mjs
 *
 * The PDF is the design-true artefact — set in the school's own typefaces on a
 * woven ground, with the engine-turned bands and the dark ceremonial cover —
 * and it is what goes to the printer. This is the editable edition: the same
 * four leaves, the same rolls, the same running order, set in typefaces that
 * are on every machine that opens a .docx, so the office can change a time or
 * add a name on the morning without a build step.
 *
 * The names, the running order, the guests and the officers are IMPORTED from
 * the builder that makes the PDF. There is no second list to fall out of step
 * with the first. Change a name there and both editions change.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  AlignmentType, BorderStyle, Document, ImageRun, PageBorderDisplay,
  PageBorderOffsetFrom, Packer, Paragraph, ShadingType, Table,
  TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import {
  AWARDS, ORDER, OFFICERS, TOTAL, PEOPLE, COORDINATORS, VENUE, WEB, MAIL, TEL,
  CHIEF_HOST, LECTURE, GUESTS, FIGURES, WELCOME, CEO_WORD, TAGLINE, OPENS, CLOSES, to12,
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
const DARK = '241A0B', CREAM = 'F3E7CC', TINT = 'F6F1E5';

const MM = (mm) => Math.round(mm * 56.6929);   // millimetres → DXA (1440/25.4)
const PX = (mm) => Math.round(mm * 96 / 25.4); // millimetres → CSS px, for images

const crestPng = readFileSync('assets/images/crests/shrs-institutional-crest.png');
const CREST_RATIO = 520 / 476;

const crest = (hMm, after = 120) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after },
  children: [new ImageRun({
    data: crestPng, type: 'png',
    transformation: { height: PX(hMm), width: Math.round(PX(hMm) * CREST_RATIO) },
  })],
});

const photo = (file, wMm, hMm) => new ImageRun({
  data: readFileSync(`assets/images/gallery/${file}`), type: 'jpg',
  transformation: { width: PX(wMm), height: PX(hMm) },
});

// ── Type fixtures ───────────────────────────────────────────────────────────
const p = (opts) => new Paragraph(opts);

const line = (text, o = {}) => p({
  alignment: o.align ?? AlignmentType.CENTER,
  spacing: { before: o.before ?? 0, after: o.after ?? 0 },
  children: [new TextRun({
    text, font: o.font ?? SERIF, size: o.size ?? 22, color: o.color ?? INK,
    bold: o.bold, italics: o.italics, allCaps: o.caps, characterSpacing: o.track,
  })],
});

const arabic = (text, o = {}) => p({
  alignment: o.align ?? AlignmentType.CENTER,
  bidirectional: true,
  spacing: { before: o.before ?? 0, after: o.after ?? 0 },
  children: [new TextRun({
    text, font: ARABIC, size: o.size ?? 24, color: o.color ?? GOLD,
    rightToLeft: true, bold: o.bold,
  })],
});

// A rule, not a row of hyphens: a hairline paragraph border in gold.
const rule = (o = {}) => p({
  alignment: AlignmentType.CENTER,
  spacing: { before: o.before ?? 160, after: o.after ?? 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: o.heavy ? 8 : 4, color: GOLD_L, space: 4 } },
  children: [new TextRun({ text: '', size: 2 })],
});

const lozenge = (o = {}) => p({
  alignment: AlignmentType.CENTER,
  spacing: { before: o.before ?? 60, after: o.after ?? 60 },
  children: [new TextRun({ text: '◆', font: SERIF, size: 14, color: GOLD_L, characterSpacing: 120 })],
});

// A section heading: small caps in gold over a hairline.
const sh = (text, o = {}) => p({
  spacing: { before: o.before ?? 200, after: o.after ?? 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD_L, space: 3 } },
  children: [new TextRun({
    text, font: SANS, size: 15, color: GOLD, allCaps: true,
    bold: true, characterSpacing: 60,
  })],
});

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
  margins: { top: o.pad ?? 40, bottom: o.pad ?? 40, left: o.padX ?? 60, right: o.padX ?? 60 },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  children,
});

const grid = (widths, rows) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths, borders: NO_BORDER, rows,
});

const TEXT_W = MM(210 - 16 - 16);
const HALF = Math.round(TEXT_W / 2);

// ── LEAF I · THE COVER ──────────────────────────────────────────────────────
const cover = [
  crest(30, 140),
  arabic('مدارس السلطان حنفي الملكية', { size: 28, after: 120 }),
  line('Sultan Hanafi Royal Schools',
    { size: 40, bold: true, track: 40, after: 100 }),
  line('Established MMXVII  ·  Ikorodu  ·  Lagos State  ·  Nigeria',
    { size: 16, font: SANS, color: SOFT, caps: true, track: 40 }),
  rule({ before: 420, after: 60, heavy: true }),
  lozenge({ before: 40, after: 360 }),
  line('The First Combined',
    { size: 21, italics: true, color: SOFT, after: 220 }),
  line('Graduation', { size: 70, bold: true, track: 30 }),
  line('Ceremony', { size: 70, bold: true, track: 30, after: 200 }),
  line('Class of 2026', { size: 24, color: GOLD, caps: true, track: 200, after: 60 }),
  rule({ before: 420, after: 400, heavy: true }),
  line('Saturday, 8 August 2026', { size: 27, bold: true, after: 80 }),
  arabic('٢٥ صفر ١٤٤٨هـ', { size: 24, after: 80 }),
  line(`${to12(OPENS)} – ${to12(CLOSES)}  ·  School Grounds, Ikorodu`,
    { size: 16, font: SANS, color: SOFT, caps: true, track: 40, after: 520 }),
  line(TAGLINE, { size: 22, italics: true, color: GOLD, after: 100 }),
  line(`${TOTAL} awards  ·  ${PEOPLE} graduands  ·  four schools`,
    { size: 14, font: SANS, color: SOFT, caps: true, track: 50, after: 100 }),
  line(VENUE, { size: 14, font: SANS, color: SOFT, after: 700 }),
  arabic('القرآن يعلو ولا يعلى', { size: 26, color: GOLD }),
];

// ── The running head the inner leaves share ─────────────────────────────────
const head = (kicker, title, o = {}) => [
  crest(o.crest ?? 10, 80),
  line(kicker, { size: 14, font: SANS, color: GOLD, caps: true, track: 90, after: 60 }),
  line(title, { size: o.size ?? 38, bold: true, track: 20 }),
  rule({ before: 110, after: o.after ?? 180 }),
];

// ── LEAF II · THE WELCOME ───────────────────────────────────────────────────
const PLATE_W = Math.round(TEXT_W / 3) - 40;
const welcome = [
  ...head('Sultan Hanafi Royal Schools', 'A Word of Welcome', { after: 140 }),
  grid([PLATE_W + 40, PLATE_W + 40, PLATE_W + 40], [new TableRow({
    children: [
      ['commissioning-day-1.jpg', 51, 34],
      ['campus-building.jpg', 51, 34],
      ['recitation-assembly-1.jpg', 51, 34],
    ].map(([f, w, h]) => cell([p({
      alignment: AlignmentType.CENTER, children: [photo(f, w, h)],
    })], PLATE_W + 40, { pad: 0, padX: 20 })),
  })]),
  p({
    alignment: AlignmentType.RIGHT, spacing: { before: 70, after: 180 },
    children: [new TextRun({
      text: 'The campus at Imowonla Road, and the assemblies that fill it',
      font: SANS, size: 12, color: SOFT, allCaps: true, characterSpacing: 30,
    })],
  }),
  p({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 140 },
    children: [
      new TextRun({ text: 'O', font: SERIF, size: 30, bold: true, color: GOLD }),
      new TextRun({ text: WELCOME[0], font: SERIF, size: 20, color: INK }),
    ],
  }),
  p({
    spacing: { before: 60, after: 140 }, indent: { left: 260 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 8 } },
    children: [new TextRun({
      text: LECTURE.title, font: SERIF, size: 24, italics: true, color: GOLD,
    })],
  }),
  p({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 100 },
    children: [new TextRun({ text: WELCOME[1], font: SERIF, size: 20, color: INK })],
  }),
  p({
    alignment: AlignmentType.RIGHT, spacing: { after: 200 },
    children: [new TextRun({
      text: 'The Board of Trustees', font: SANS, size: 13, color: SOFT,
      allCaps: true, characterSpacing: 60,
    })],
  }),
  // The founding figures, ruled above and below.
  rule({ before: 0, after: 90 }),
  grid(FIGURES.map(() => Math.round(TEXT_W / FIGURES.length)), [new TableRow({
    children: FIGURES.map(([n, l]) => cell([
      p({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: n, font: SERIF, size: 30, bold: true, color: GOLD })],
      }),
      p({
        alignment: AlignmentType.CENTER, spacing: { before: 40 },
        children: [new TextRun({
          text: l, font: SANS, size: 11, color: SOFT, allCaps: true, characterSpacing: 30,
        })],
      }),
    ], Math.round(TEXT_W / FIGURES.length), { pad: 20 })),
  })]),
  rule({ before: 90, after: 60 }),
  // The chief host and the lecture on the left, the guests on the right.
  grid([HALF, HALF], [new TableRow({
    children: [
      cell([
        sh('The Chief Host', { before: 100 }),
        p({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({
            text: CHIEF_HOST[1], font: ARABIC, size: 22, color: GOLD, rightToLeft: true,
          })],
        }),
        p({ children: [new TextRun({ text: CHIEF_HOST[0], font: SERIF, size: 25, bold: true })] }),
        p({
          spacing: { before: 40 },
          children: [new TextRun({
            text: CHIEF_HOST[2], font: SANS, size: 12, color: SOFT,
            allCaps: true, characterSpacing: 40,
          })],
        }),
        sh('The Lecture'),
        p({
          children: [new TextRun({
            text: `“${LECTURE.title}”`, font: SERIF, size: 22, italics: true, color: GOLD,
          })],
        }),
        p({
          spacing: { before: 60 },
          children: [new TextRun({ text: LECTURE.by, font: SERIF, size: 23, bold: true })],
        }),
      ], HALF, { pad: 0, padX: 0 }),
      cell([
        sh('Distinguished Guests', { before: 100 }),
        ...GUESTS.flatMap(([n, r]) => [
          p({
            spacing: { before: 60, after: r ? 0 : 60 },
            children: [new TextRun({ text: n, font: SERIF, size: 21, bold: true })],
          }),
          ...(r ? [p({
            spacing: { after: 60 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D8CBAE', space: 2 } },
            children: [new TextRun({
              text: r, font: SANS, size: 11, color: SOFT, allCaps: true, characterSpacing: 20,
            })],
          })] : []),
        ]),
      ], HALF, { pad: 0, padX: 0, }),
    ],
  })]),
  // The Chief Executive Director's word, reversed out on a dark panel.
  grid([TEXT_W], [new TableRow({
    children: [cell([
      p({
        spacing: { after: 90 },
        children: [new TextRun({
          text: 'A Word from the Chief Executive Director', font: SANS, size: 13,
          color: 'D8BC7C', bold: true, allCaps: true, characterSpacing: 60,
        })],
      }),
      ...CEO_WORD.map((t) => p({
        alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 },
        children: [new TextRun({ text: t, font: SERIF, size: 19, color: CREAM })],
      })),
      p({
        alignment: AlignmentType.RIGHT, spacing: { before: 60 },
        children: [new TextRun({ text: CHIEF_HOST[0], font: SERIF, size: 22, bold: true, color: 'FBF3E1' })],
      }),
      p({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({
          text: CHIEF_HOST[2], font: SANS, size: 11, color: 'D8BC7C',
          allCaps: true, characterSpacing: 40,
        })],
      }),
    ], TEXT_W, { fill: DARK, pad: 140, padX: 180 })],
  })]),
];

// ── LEAF III · THE ORDER OF PROCEEDINGS ─────────────────────────────────────
const TIME_W = Math.round(TEXT_W * 0.24);
const ITEM_W = TEXT_W - TIME_W;

const orderLeaf = [
  ...head('The Order of the Day', 'Order of Proceedings', { after: 110 }),
  grid([TIME_W, ITEM_W], ORDER.map(([a, b, t, s], i) => {
    const ar = s && /[؀-ۿ]/.test(s);
    return new TableRow({
      children: [
        cell([p({
          spacing: { before: 16, after: 16 },
          children: [new TextRun({
            text: `${a} – ${b}`, font: SANS, size: 16, color: GOLD,
            bold: true, characterSpacing: 10,
          })],
        })], TIME_W, { fill: i % 2 ? undefined : TINT }),
        cell([
          // English left, Arabic right, one baseline — the pairing rule the
          // certificate suite is built on, applied to the running order.
          p({
            spacing: { before: 12, after: s && !ar ? 0 : 12 },
            tabStops: [{ type: 'right', position: ITEM_W - 180 }],
            children: [
              new TextRun({ text: t, font: SERIF, size: 23, color: INK }),
              ...(ar ? [
                new TextRun({ text: '\t', font: SERIF, size: 23 }),
                new TextRun({ text: s, font: ARABIC, size: 21, color: GOLD, rightToLeft: true }),
              ] : []),
            ],
          }),
          ...(s && !ar ? [p({
            spacing: { after: 12 },
            children: [new TextRun({ text: s, font: SANS, size: 14, color: SOFT, italics: true })],
          })] : []),
        ], ITEM_W, { fill: i % 2 ? undefined : TINT }),
      ],
    });
  })),
  line('Programme Coordinators',
    { size: 12, font: SANS, color: GOLD, caps: true, track: 90, before: 160, after: 50 }),
  line(COORDINATORS, { size: 22, after: 60 }),
  rule({ before: 110, after: 60 }),
  line('Presiding and Officiating',
    { size: 14, font: SANS, color: GOLD, caps: true, track: 90, bold: true, after: 110 }),
  grid([HALF, HALF], (() => {
    const rows = [];
    for (let i = 0; i < OFFICERS.length; i += 2) {
      rows.push(new TableRow({
        children: [OFFICERS[i], OFFICERS[i + 1]].map((o) => cell(o ? [
          // Arabic above, English below — never the other way round.
          ...(o[1] ? [p({
            children: [new TextRun({ text: o[1], font: ARABIC, size: 21, color: GOLD, rightToLeft: true })],
          })] : []),
          p({ children: [new TextRun({ text: o[0], font: SERIF, size: 23, bold: true })] }),
          p({
            spacing: { before: 26, after: 90 },
            children: [new TextRun({
              text: o[2], font: SANS, size: 11, color: SOFT, allCaps: true, characterSpacing: 20,
            })],
          }),
        ] : [p({ children: [] })], HALF, { pad: 0 })),
      }));
    }
    return rows;
  })()),
  // The four schools close the book.
  rule({ before: 120, after: 70 }),
  grid([HALF / 2, HALF / 2, HALF / 2, HALF / 2], [new TableRow({
    children: [
      ['Sultan Hanafi Nursery and Primary School', 'Ages 2 to 10', ''],
      ['Sultan Hanafi Royal College', 'Junior and Senior Secondary', ''],
      ['Sultan Hanafi School of Islamic and Arabic Studies', '', 'قسم الدراسات الإسلامية والعربية'],
      ['Sultan Hanafi Qur’an College', '', 'كلية السلطان حنفي للقرآن'],
    ].map(([n, sub, ar]) => cell([
      p({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: n, font: SERIF, size: 17, bold: true })],
      }),
      ...(sub ? [p({
        alignment: AlignmentType.CENTER, spacing: { before: 40 },
        children: [new TextRun({
          text: sub, font: SANS, size: 10, color: SOFT, allCaps: true, characterSpacing: 30,
        })],
      })] : []),
      ...(ar ? [p({
        alignment: AlignmentType.CENTER, spacing: { before: 40 }, bidirectional: true,
        children: [new TextRun({ text: ar, font: ARABIC, size: 17, color: GOLD, rightToLeft: true })],
      })] : []),
    ], HALF / 2, { pad: 10 })),
  })]),
  rule({ before: 70, after: 100 }),
  line('Every certificate conferred today is verifiable.',
    { size: 20, bold: true, color: GOLD, after: 80 }),
  p({
    alignment: AlignmentType.CENTER, spacing: { after: 110 },
    children: [new TextRun({
      text: 'Each carries a certificate number, a verification code and a QR code '
        + 'registered with the Office of the Registrar — scan the code on any '
        + `certificate, or enter its number at ${WEB}/verify-certificate.`,
      font: SERIF, size: 17, color: SOFT, italics: true,
    })],
  }),
  line(VENUE, { size: 13, font: SANS, color: SOFT, track: 20, after: 50 }),
  line(`${WEB}  ·  ${MAIL}  ·  ${TEL}`,
    { size: 13, font: SANS, color: SOFT, track: 20, after: 90 }),
  arabic('القرآن يعلو ولا يعلى', { size: 23, color: GOLD }),
];

// ── LEAF IV · THE GRADUANDS ─────────────────────────────────────────────────
const twoUp = (names) => {
  const half = Math.ceil(names.length / 2);
  const rows = [];
  for (let i = 0; i < half; i += 1) {
    rows.push(new TableRow({
      children: [names[i], names[i + half]].map((n, k) => cell([p({
        spacing: { before: 8, after: 8 },
        children: n ? [
          new TextRun({ text: `${k === 0 ? i + 1 : i + half + 1}.  `, font: SANS, size: 13, color: GOLD_L }),
          new TextRun({ text: n, font: SERIF, size: 20, color: INK }),
        ] : [],
      })], HALF, { pad: 0 })),
    }));
  }
  return grid([HALF, HALF], rows);
};

const rollLeaf = [
  ...head('Class of 2026', 'The Graduands', { crest: 9, size: 34, after: 120 }),
  p({
    alignment: AlignmentType.CENTER, spacing: { after: 110 },
    children: [new TextRun({
      text: 'The Board of Governors, the Principals and the Head Teacher present '
        + 'the following graduands, each of whom has completed the requirements of '
        + 'their programme and is admitted to the award named beneath their school. '
        + 'A graduand who has completed two programmes is named under each.',
      font: SERIF, size: 18, color: SOFT, italics: true,
    })],
  }),
  ...AWARDS.flatMap((a) => [
    ...(a.ar ? [p({
      spacing: { before: 110, after: 0 }, keepNext: true,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD_L, space: 6 } },
      children: [new TextRun({ text: a.ar, font: ARABIC, size: 20, color: GOLD_L, rightToLeft: true })],
    })] : []),
    p({
      spacing: { before: a.ar ? 0 : 110, after: 0 }, keepNext: true,
      border: a.ar ? undefined
        : { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD_L, space: 6 } },
      children: [new TextRun({ text: a.title, font: SERIF, size: 23, bold: true, color: GOLD })],
    }),
    p({
      spacing: { after: 0 }, keepNext: true,
      children: [new TextRun({
        text: a.school, font: SANS, size: 13, color: SOFT, allCaps: true, characterSpacing: 30,
      })],
    }),
    p({
      spacing: { after: 60 }, keepNext: true,
      children: [new TextRun({ text: a.note, font: SERIF, size: 16, color: SOFT, italics: true })],
    }),
    twoUp(a.names),
  ]),
];

// ── The document ────────────────────────────────────────────────────────────
// Four sections, not four page breaks. A trailing page-break paragraph belongs
// to the page it sits on, so a leaf that fills to its last line pushes the
// break onto a fresh sheet and leaves a blank one behind. A section boundary
// cannot do that, and it lets each leaf carry its own margins.
const leaf = (children, margin) => ({
  properties: {
    page: {
      size: { width: MM(210), height: MM(297) },
      margin,
      // A gold double frame on every leaf, held clear of the paper edge so no
      // printer trims into it.
      borders: {
        pageBorders: {
          display: PageBorderDisplay.ALL_PAGES,
          offsetFrom: PageBorderOffsetFrom.PAGE,
        },
        pageBorderTop: { style: BorderStyle.DOUBLE, size: 6, color: GOLD_L, space: 20 },
        pageBorderBottom: { style: BorderStyle.DOUBLE, size: 6, color: GOLD_L, space: 20 },
        pageBorderLeft: { style: BorderStyle.DOUBLE, size: 6, color: GOLD_L, space: 20 },
        pageBorderRight: { style: BorderStyle.DOUBLE, size: 6, color: GOLD_L, space: 20 },
      },
    },
  },
  children,
});

const MARGIN = { top: MM(19), bottom: MM(15), left: MM(16), right: MM(16) };
const TIGHT = { top: MM(14), bottom: MM(12), left: MM(15), right: MM(15) };

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS Graduation Ceremony 2026 — Programme',
  description: `Order of proceedings and the roll of graduands, 8 August 2026. `
    + `${TOTAL} awards conferred upon ${PEOPLE} graduands.`,
  styles: { default: { document: { run: { font: SERIF, size: 22, color: INK } } } },
  sections: [
    leaf(cover, MARGIN),
    leaf(welcome, TIGHT),
    leaf(orderLeaf, MARGIN),
    leaf(rollLeaf, TIGHT),
  ],
});

const out = 'dist/graduation-programme/SHRS-Graduation-Programme-2026.docx';
const buf = await Packer.toBuffer(doc);
writeFileSync(out, buf);
console.log(`\n  ${out}  ${(buf.length / 1024).toFixed(0)} KB`);
console.log(`  4 leaves · ${TOTAL} awards · ${PEOPLE} graduands · ${GUESTS.length} distinguished guests\n`);
