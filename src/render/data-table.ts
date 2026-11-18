import type { DeckTable } from '../parse/deck.js';
import { inlineVisibleText } from '../parse/inline.js';
import { DATA_TABLE } from '../theme/data.js';
import type { PtRect } from '../theme/scope.js';
import { colourChanges } from './change-colour.js';
import { colourRoles } from './table-roles.js';
import type { PlacedTable } from './placed.js';

/*
 * A native table in the data layout's evidence band (W11 QA 17 Nov 2026, T2 - T4).
 * - Every cell is padded (DATA_TABLE.padLeftPt / padRightPt) and every width includes that padding, so the texts of two
 *   neighbouring columns are always at least padLeft + padRight apart, whatever the alignment (fix round 2).
 * - Number columns (right- or centre-aligned) never wrap: each is as wide as its widest cell, header included; only
 *   when the table would not fit otherwise does a number header wrap, at spaces, never inside a word.
 * - Text columns share the rest in proportion to their longest cell and WRAP INSIDE THE CELL: the row grows, it never
 *   splits into extra rows. Wrapping is estimated with a wide glyph (DATA_TABLE.glyphEm) so Keynote never needs more
 *   lines than the row has.
 * - The text starts at DATA_TABLE.sizePt (32pt, W11 lead review 18 Nov 2026: a short table fills its band) and shrinks
 *   (2pt steps) only down to DATA_TABLE.minPt (24pt); a table that does not fit then fails the build
 *   naming the reason, never a table that runs off the slide.
 */
const visible = (table: DeckTable): string[][] =>
  [table.header, ...table.rows].map((row) => row.map((cell) => inlineVisibleText(cell)));

/* Bold cells: the header row, cells written bold, and answer words (table-roles.ts makes them bold). */
const ANSWER_WORD = /^(YES|NO|PASS|FAIL)\b/;
const boldGrid = (table: DeckTable): boolean[][] =>
  [table.header, ...table.rows].map((row, r) =>
    row.map((cell) => r === 0 || cell.includes('**') || ANSWER_WORD.test(inlineVisibleText(cell).trim())),
  );

const PAD = DATA_TABLE.padLeftPt + DATA_TABLE.padRightPt;

/* Helvetica Neue advance widths in em (regular), grouped; anything not listed counts as 0.56 (lower case) or 0.72
   (upper case). Used together with the flat glyphEm: the wider of the two estimates wins, so a column of percent
   signs or capitals is never narrower than its text and a plain column never narrower than before. */
const GLYPH_EM: ReadonlyArray<readonly [RegExp, number]> = [
  [/[0-9#$]/, 0.56],
  [/[ .,:;!|'ijl]/, 0.28],
  [/[ftI()[\]/]/, 0.32],
  [/[r-]/, 0.4],
  [/[+=<>~]/, 0.6],
  [/[mMW%@]/, 0.86],
  [/[w]/, 0.76],
  [/[A-Z]/, 0.72],
];
const glyphEm = (ch: string): number => GLYPH_EM.find(([re]) => re.test(ch))?.[1] ?? 0.56;
const textW = (s: string, sizePt: number, bold = false): number => {
  const perGlyph = [...s].reduce((sum, ch) => sum + glyphEm(ch), 0);
  return Math.max(s.length * DATA_TABLE.glyphEm, perGlyph) * sizePt * (bold ? DATA_TABLE.boldEm : 1);
};
const isText = (table: DeckTable, col: number): boolean => (table.align[col] ?? 'left') === 'left';
const words = (cell: string): string[] => cell.split(/\s+/).filter((w) => w !== '');

/** Lines a cell needs in a column of width `colW` (greedy word wrap at spaces; a word never splits). */
const linesOf = (cell: string, colW: number, sizePt: number, bold: boolean): number => {
  const room = colW - PAD;
  let lines = 1;
  let used = 0;
  for (const word of words(cell)) {
    const w = textW(word, sizePt, bold);
    const add = used === 0 ? w : used + textW(' ', sizePt, bold) + w;
    if (add <= room + 0.01 || used === 0) used = add;
    else {
      lines += 1;
      used = w;
    }
  }
  return lines;
};

/**
 * Column widths at `sizePt`, or undefined when a number column or a single word cannot fit.
 * A number column is as wide as its widest body cell and its whole header (one line); with `compact` its header may
 * wrap at spaces, so it is only as wide as the header's longest word. Text columns get at least their longest word.
 * Every width includes the cell padding (PAD), so neighbouring texts stay PAD apart.
 */
const columnWidths = (table: DeckTable, widthPt: number, sizePt: number, compact = false): number[] | undefined => {
  const grid = visible(table);
  const bold = boldGrid(table);
  const cols = table.header.map((_, col) => grid.map((row, r) => ({ text: row[col] ?? '', bold: bold[r]?.[col] ?? false, r })));
  const wordW = (c: { text: string; bold: boolean }): number => Math.max(0, ...words(c.text).map((w) => textW(w, sizePt, c.bold)));
  /* One line, measured word by word exactly as linesOf() wraps, so a cell given its full width never wraps. */
  const fullW = (c: { text: string; bold: boolean }): number => {
    const ws = words(c.text);
    const gaps = Math.max(0, ws.length - 1) * textW(' ', sizePt, c.bold);
    return Math.max(textW(c.text, sizePt, c.bold), ws.reduce((sum, w) => sum + textW(w, sizePt, c.bold), gaps));
  };
  const full = cols.map((cells) => Math.max(...cells.map(fullW)) + PAD);
  const word = cols.map((cells) => Math.max(...cells.map(wordW)) + PAD);
  const numberW = cols.map(
    (cells) => Math.max(...cells.map((c) => (compact && c.r === 0 ? wordW(c) : fullW(c)))) + PAD,
  );
  const fixed = cols.reduce((sum, _, col) => (isText(table, col) ? sum : sum + (numberW[col] ?? 0)), 0);
  const textCols = cols.map((_, col) => col).filter((col) => isText(table, col));
  const room = widthPt - fixed;
  if (textCols.length === 0) return fixed <= widthPt ? numberW.map((w) => (w * widthPt) / fixed) : undefined;
  const natural = textCols.reduce((sum, col) => sum + (full[col] ?? 0), 0);
  /* Every text column gets at least its longest word; the rest goes to the columns that still want more. */
  const least = textCols.reduce((sum, col) => sum + (word[col] ?? 0), 0);
  const want = textCols.reduce((sum, col) => sum + (full[col] ?? 0) - (word[col] ?? 0), 0);
  const spare = room - least;
  if (spare < 0) return undefined;
  if (want <= spare) return full.map((w, col) => (isText(table, col) ? w + ((spare - want) * w) / natural : numberW[col] ?? 0));
  /* Not every text column fits on one line: the columns that need the least extra width get their whole line first
     (each one that fits saves wrapped rows), the others share what is left in proportion to what they still want. */
  const extra = (col: number): number => (full[col] ?? 0) - (word[col] ?? 0);
  const whole = new Set<number>();
  let left = spare;
  for (const col of [...textCols].sort((a, b) => extra(a) - extra(b))) {
    if (extra(col) > left) break;
    whole.add(col);
    left -= extra(col);
  }
  const rest = textCols.filter((col) => !whole.has(col)).reduce((sum, col) => sum + extra(col), 0);
  return full.map((w, col) => {
    if (!isText(table, col)) return numberW[col] ?? 0;
    if (whole.has(col)) return w;
    return (word[col] ?? 0) + (rest === 0 ? 0 : (left * extra(col)) / rest);
  });
};

/**
 * Widths with whole number headers, or with number headers wrapped at spaces (never mid-word), whichever makes the
 * lower table: a two-line header row is cheaper than text columns squeezed into extra lines. Ties keep whole headers.
 */
const widthsFor = (table: DeckTable, widthPt: number, sizePt: number): number[] | undefined => {
  const whole = columnWidths(table, widthPt, sizePt);
  const compact = columnWidths(table, widthPt, sizePt, true);
  if (whole === undefined || compact === undefined) return whole ?? compact;
  const h = (colW: number[]): number => rowHeights(table, colW, sizePt).reduce((a, b) => a + b, 0);
  return h(compact) < h(whole) ? compact : whole;
};

/** Row heights (header first) at `sizePt` for the given column widths. */
const rowHeights = (table: DeckTable, colW: readonly number[], sizePt: number): number[] => {
  const bold = boldGrid(table);
  return visible(table).map((row, r) => {
    const lines = Math.max(
      ...row.map((cell, col) =>
        isText(table, col) || r === 0 ? linesOf(cell, colW[col] ?? 0, sizePt, bold[r]?.[col] ?? false) : 1,
      ),
    );
    return sizePt * DATA_TABLE.rowEm + (lines - 1) * sizePt * DATA_TABLE.lineEm;
  });
};

/** Height in pt the table needs at `sizePt` in a band `widthPt` wide (Infinity when it cannot be laid out). */
export const tableHeightPt = (table: DeckTable, sizePt: number, widthPt: number): number => {
  const colW = widthsFor(table, widthPt, sizePt);
  return colW === undefined ? Infinity : rowHeights(table, colW, sizePt).reduce((a, b) => a + b, 0);
};

/** The largest size at which the table fits `widthPt` and `maxH`; throws when none does. */
export const fittedTableSizePt = (table: DeckTable, widthPt: number, maxH: number): number => {
  for (let size = DATA_TABLE.sizePt; size >= DATA_TABLE.minPt; size -= 2) {
    if (tableHeightPt(table, size, widthPt) <= maxH) return size;
  }
  if (widthsFor(table, widthPt, DATA_TABLE.minPt) === undefined) {
    throw new Error(`table columns do not fit ${Math.round(widthPt)}pt at ${DATA_TABLE.minPt}pt - shorten a number cell or drop a column`);
  }
  throw new Error(
    `table with ${table.rows.length} rows needs ${Math.round(tableHeightPt(table, DATA_TABLE.minPt, widthPt))}pt, ` +
      `the slide has ${Math.round(maxH)}pt - split it over two slides`,
  );
};

/** Place the table at the top of `frame` at `sizePt`. */
export const placeTable = (table: DeckTable, frame: PtRect, sizePt: number): PlacedTable => {
  const colW = widthsFor(table, frame.w, sizePt);
  if (colW === undefined) throw new Error('table does not fit its frame');
  const rowHs = rowHeights(table, colW, sizePt);
  return {
    kind: 'table',
    rect: { x: frame.x, y: frame.y, w: frame.w, h: rowHs.reduce((a, b) => a + b, 0) },
    sizePt,
    rowHs,
    colW,
    header: table.header,
    rows: colourRoles(table.header, table.rows.map(colourChanges)),
    align: table.align,
    padLeftPt: DATA_TABLE.padLeftPt,
    padRightPt: DATA_TABLE.padRightPt,
    headerFill: DATA_TABLE.headerFill,
    border: DATA_TABLE.border,
    borderPt: DATA_TABLE.borderPt,
    color: DATA_TABLE.color,
  };
};
