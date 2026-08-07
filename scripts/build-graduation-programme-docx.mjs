#!/usr/bin/env node
/**
 * The Word edition of the Graduation Ceremony Programme — the same trifold.
 *
 *     node scripts/build-graduation-programme-docx.mjs
 *
 * Four landscape sides — two sheets, printed both sides — each set in three
 * columns with a column break between panels: fold twice and it reads in the
 * same order as the press file. Sheet I is the programme; Sheet II is the roll
 * of graduands and nests inside it. The PDF
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
  AWARDS, ORDER, TOTAL, PEOPLE, COORDINATORS, VENUE, WEB, MAIL, TEL,
  CHIEF_HOST, LECTURE, LECTURE_SLOT, GUESTS, FIGURES, WELCOME, CEO_WORD, DIGITAL,
  TAGLINE, OPENS, CLOSES, to12,
} from './build-graduation-programme.mjs';

// No Principal, Ra'ees, Mudeer or Head Teacher is named in this programme. The
// Founder's ruling of 8 August 2026: only the Chief Host is named, and the
// presiding offices are named without their holders. OFFICERS is deliberately
// not imported here — there is nowhere in this document for it to go.

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
  ...plate('campus-hero.jpg', COL, 41,
    'Sultan Hanafi Royal Schools · Imowonla Road'),
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
  ...plate('campus-gate.jpg', COL, 34, 'The Campus Gate'),
  sh('The Four Schools'),
  ...[
    ['Nursery and Primary School', 'Ages 2 to 10', ''],
    ['Royal College', 'Junior and Senior Secondary', ''],
    ['School of Islamic and Arabic Studies', '', 'قسم الدراسات الإسلامية والعربية'],
    ['Qur’an College', '', 'كلية السلطان حنفي للقرآن'],
  ].flatMap(([n, sub, ar]) => [
    line(n, { size: 16, bold: true, before: 40 }),
    ...(sub ? [line(sub, { size: 8, font: SANS, color: SOFT, caps: true, track: 30 })] : []),
    ...(ar ? [arabic(ar, { size: 14 })] : []),
  ]),
  rule({ before: 110, after: 60 }),
  line('Every certificate is verifiable.', { size: 14, bold: true, color: GOLD, after: 40 }),
  p({
    alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({
      text: 'Each carries a certificate number, a verification code and a QR code '
        + 'registered with the Office of the Registrar — scan the code, or enter '
        + `the number at ${WEB}/verify-certificate.`,
      font: SERIF, size: 14, color: SOFT, italics: true,
    })],
  }),
  line(VENUE, { size: 9, font: SANS, color: SOFT, track: 10, after: 40 }),
  line(`${WEB} · ${MAIL} · ${TEL}`, { size: 9, font: SANS, color: SOFT, track: 10, after: 120 }),
  arabic('القرآن يعلو ولا يعلى', { size: 19, color: GOLD, after: 140 }),
  ...plate('college-hall.jpg', COL, 30, 'The School Studio'),
];

// ── PANEL · THE COVER ───────────────────────────────────────────────────────
const panelCover = [
  ...plate('campus-building.jpg', COL, 50, 'The campus at Imowonla Road'),
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
  ...plate('islamic-prayer-hall.jpg', COL, 28, 'The Prayer Hall'),
  ...head('The Order of the Day', 'Order of Proceedings'),
  grid([TIME_W, CW - TIME_W], ORDER.map(([a, b, t, s0], i) => {
    // The lecture is the centre of the afternoon: its row is struck, and it
    // carries the topic so the running order cannot disagree with the feature
    // panel about what is being delivered.
    const mark = t === 'Lecture';
    const s = mark && !s0 ? LECTURE.title : s0;
    const ar = s && /[؀-ۿ]/.test(s);
    return new TableRow({
      children: [
        cell([p({
          spacing: { before: 22, after: 22 },
          children: [new TextRun({
            text: `${a}–${b}`, font: SANS, size: 10, color: GOLD, bold: true,
          })],
        })], TIME_W, { fill: mark ? 'EFE2C2' : (i % 2 ? undefined : TINT), padX: 40 }),
        cell([
          p({
            spacing: { before: 18, after: s ? 0 : 18 },
            children: [new TextRun({
              text: t, font: SERIF, size: mark ? 17 : 16, color: mark ? GOLD : INK,
              bold: mark, allCaps: mark, characterSpacing: mark ? 20 : undefined,
            })],
          }),
          ...(s ? [p({
            spacing: { after: 18 },
            children: ar
              ? [new TextRun({ text: s, font: ARABIC, size: 15, color: GOLD, rightToLeft: true })]
              : [new TextRun({
                text: s, font: mark ? SERIF : SANS, size: mark ? 15 : 10,
                color: mark ? INK : SOFT, italics: true, bold: mark,
              })],
          })] : []),
        ], CW - TIME_W, { fill: mark ? 'EFE2C2' : (i % 2 ? undefined : TINT), padX: 40 }),
      ],
    });
  })),
  line('Programme Coordinators',
    { size: 9, font: SANS, color: GOLD, caps: true, track: 70, before: 140, after: 40 }),
  line(COORDINATORS, { size: 16, after: 60 }),
];

// ── PANEL · THE CHIEF HOST ──────────────────────────────────────────────────
// A panel of its own, and the only officer named anywhere in this programme.
const panelHost = [
  p({
    alignment: AlignmentType.CENTER, spacing: { before: 260, after: 120 },
    children: [img('crests', 'shrs-institutional-crest.png', 19 * (520 / 476), 19)],
  }),
  line('The Chief Host',
    { size: 11, font: SANS, color: SOFT, caps: true, track: 90, after: 40 }),
  rule({ before: 100, after: 180, heavy: true }),
  arabic(CHIEF_HOST[1], { size: 22, after: 100 }),
  line(CHIEF_HOST[0], { size: 30, bold: true, color: GOLD, caps: true, track: 20 }),
  line(CHIEF_HOST[2],
    { size: 11, font: SANS, color: INK, caps: true, track: 60, before: 160 }),
  line('Chairman, Board of Governors',
    { size: 11, font: SANS, color: INK, caps: true, track: 60, before: 60 }),
  rule({ before: 180, after: 160 }),
  p({
    alignment: AlignmentType.CENTER, spacing: { after: 220 },
    children: [new TextRun({
      text: 'Presiding over the first combined convocation of the four schools, '
        + 'and conferring every award named in this programme.',
      font: SERIF, size: 16, italics: true, color: SOFT,
    })],
  }),
  ...plate('campus-building.jpg', COL, 72, 'The Campus at Imowonla Road'),
];

// ── PANEL · THE LECTURE OF THE DAY ──────────────────────────────────────────
// The topic is the largest piece of type inside the programme: a guest should
// find it without reading a single other line.
const panelLecture = [
  line('The Lecture of the Day',
    { size: 11, font: SANS, color: SOFT, caps: true, track: 90, before: 300, after: 40 }),
  rule({ before: 100, after: 200, heavy: true }),
  line(LECTURE.title, { size: 34, bold: true, color: GOLD, caps: true, track: 16 }),
  rule({ before: 220, after: 200 }),
  line('Delivered by', { size: 18, italics: true, color: SOFT, after: 80 }),
  line(LECTURE.by, { size: 26, bold: true }),
  line(`${LECTURE_SLOT[0]} – ${LECTURE_SLOT[1]} · Saturday, 8 August 2026`,
    { size: 10, font: SANS, color: GOLD, caps: true, track: 50, before: 140 }),
  line('The School Grounds · Ikorodu, Lagos State',
    { size: 9, font: SANS, color: SOFT, caps: true, track: 40, before: 50, after: 240 }),
  ...plate('recitation-assembly-1.jpg', COL, 68, 'The Assembly Hall'),
];

// ── PANEL · THE DISTINGUISHED GUESTS ────────────────────────────────────────
const panelGuests = [
  ...head('In Attendance', 'Distinguished Guests'),
  ...GUESTS.flatMap(([n, r]) => [
    p({
      spacing: { before: 70, after: r ? 0 : 70 },
      children: [new TextRun({ text: n, font: SERIF, size: 17, bold: true })],
    }),
    ...(r ? [p({
      spacing: { before: 14, after: 70 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'DDD2B7', space: 2 } },
      children: [new TextRun({
        text: r, font: SANS, size: 9, color: SOFT, allCaps: true, characterSpacing: 10,
      })],
    })] : []),
  ]),
  ...plate('scholarly-visit-1.jpg', COL, 38, 'A Scholarly Visit'),
  sh('The Presiding Officers'),
  // The offices are named. Their holders are not — the Founder's ruling.
  p({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 },
    children: [new TextRun({
      text: 'The Board of Governors, the Principals of the Royal College and of '
        + 'the School of Islamic and Arabic Studies, the Mudeer of the Qur’an '
        + 'College and the Head Teacher of the Nursery and Primary School present '
        + 'the graduands named in this programme.',
      font: SERIF, size: 16, italics: true, color: SOFT,
    })],
  }),
  ...plate('boarding-dining.jpg', COL, 42, 'The Dining Hall'),
];

// ── PANEL · THE DIGITAL CAMPUS ──────────────────────────────────────────────
// Every capability named here is running in the school's own systems today.
// Nothing on this panel is a roadmap item or an intention.
const panelDigital = [
  ...head('Technology and the Record', 'The Digital Campus'),
  p({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 90 },
    children: [new TextRun({ text: DIGITAL.lead, font: SERIF, size: 16, color: INK })],
  }),
  p({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 150 },
    children: [new TextRun({ text: DIGITAL.body, font: SERIF, size: 15, color: SOFT })],
  }),
  ...DIGITAL.items.flatMap(([t, d]) => [
    p({
      spacing: { before: 80, after: 0 },
      children: [new TextRun({
        text: t, font: SANS, size: 11, bold: true, color: GOLD,
        allCaps: true, characterSpacing: 20,
      })],
    }),
    p({
      spacing: { before: 18, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'DDD2B7', space: 2 } },
      children: [new TextRun({ text: d, font: SERIF, size: 15, color: SOFT })],
    }),
  ]),
  ...plate('ict-computer-laboratory.jpg', COL, 30, 'ICT Laboratory'),
  ...plate('chemistry-laboratory.jpg', COL, 30, 'Chemistry Laboratory'),
];

// ── PANEL · THE CLASS OF 2026 (the insert's face) ───────────────────────────
const panelClass = [
  p({
    alignment: AlignmentType.CENTER, spacing: { before: 300, after: 140 },
    children: [img('crests', 'shrs-institutional-crest.png', 22 * (520 / 476), 22)],
  }),
  line('The Roll of', { size: 19, italics: true, color: SOFT, after: 70 }),
  line('The Graduands', { size: 42, bold: true, color: GOLD, caps: true, track: 20 }),
  rule({ before: 200, after: 200, heavy: true }),
  grid([Math.round(CW / 2), Math.round(CW / 2)], [
    [[String(TOTAL), 'Awards conferred'], [String(PEOPLE), 'Graduands']],
    [[String(AWARDS.length), 'Award rolls'], ['4', 'Schools']],
  ].map((pair) => new TableRow({
    children: pair.map(([n, l]) => cell([
      p({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: n, font: SERIF, size: 30, bold: true, color: GOLD })],
      }),
      p({
        alignment: AlignmentType.CENTER, spacing: { before: 30 },
        children: [new TextRun({
          text: l, font: SANS, size: 9, color: SOFT, allCaps: true, characterSpacing: 20,
        })],
      }),
    ], Math.round(CW / 2), { pad: 60, padX: 20 })),
  }))),
  rule({ before: 200, after: 200, heavy: true }),
  line('Class of 2026', { size: 15, color: GOLD, caps: true, track: 160, after: 260 }),
  ...plate('spelling-competition.jpg', COL, 52, 'Spelling Competition'),
];

// ── PANELS · THE GRADUANDS ──────────────────────────────────────────────────
const rollPanel = (codes, lead, file, cap) => [
  ...head('Class of 2026', lead ? 'The Graduands' : 'The Graduands · continued'),
  ...(lead ? [p({
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({
      text: 'Each graduand named here has completed the requirements of their '
        + 'programme and is admitted to the award beneath their school. One who '
        + 'has completed two programmes is named under each.',
      font: SERIF, size: 14, color: SOFT, italics: true,
    })],
  })] : []),
  ...codes.flatMap((c) => roll(byCode[c])),
  p({ spacing: { before: 200 }, children: [new TextRun({ text: '', size: 2 })] }),
  ...plate(file, COL, 62, cap),
];

const panelRollA = rollPanel(['QUR', 'IBT'], true,
  'quran-recitation-1.jpg', 'Qur’an Recitation');
const panelRollB = rollPanel(['IDD', 'PRY'], false,
  'basic-school-classroom.jpg', 'A Classroom in Session');
const panelRollC = rollPanel(['JSS', 'SS'], false,
  'biology-laboratory.jpg', 'The Biology Laboratory');

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
    sheet([panelHost, panelLecture, panelOrder]),
    sheet([panelGuests, panelDigital, panelClass]),
    sheet([panelRollA, panelRollB, panelRollC]),
  ],
});

const out = 'dist/graduation-programme/SHRS-Graduation-Programme-2026.docx';
const buf = await Packer.toBuffer(doc);
writeFileSync(out, buf);
console.log(`\n  ${out}  ${(buf.length / 1024).toFixed(0)} KB`);
console.log(`  trifold · 4 sides of 3 columns · ${COL.toFixed(1)}mm panels`);
console.log(`  ${TOTAL} awards · ${PEOPLE} graduands · ${GUESTS.length} distinguished guests\n`);
