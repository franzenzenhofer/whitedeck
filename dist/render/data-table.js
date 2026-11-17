import { inlineVisibleText } from '../parse/inline.js';
import { DATA_TABLE } from '../theme/data.js';
import { colourChanges } from './change-colour.js';
import { colourRoles } from './table-roles.js';
/*
 * A native table in the data layout's evidence band (W11 QA 17 Nov 2026, T2 - T4).
 * - Number columns (right- or centre-aligned) never wrap: each is exactly as wide as its widest cell, header included.
 * - Text columns share the rest in proportion to their longest cell and WRAP INSIDE THE CELL: the row grows, it never
 *   splits into extra rows. Wrapping is estimated with a wide glyph (DATA_TABLE.glyphEm) so Keynote never needs more
 *   lines than the row has.
 * - The text shrinks (2pt steps) only down to DATA_TABLE.minPt (24pt); a table that does not fit then fails the build
 *   naming the reason, never a table that runs off the slide.
 */
const visible = (table) => [table.header, ...table.rows].map((row) => row.map((cell) => inlineVisibleText(cell)));
const PAD = DATA_TABLE.padLeftPt + DATA_TABLE.padRightPt;
const textW = (s, sizePt) => s.length * sizePt * DATA_TABLE.glyphEm;
const isText = (table, col) => (table.align[col] ?? 'left') === 'left';
/** Lines a cell needs in a column of width `colW` (greedy word wrap). */
const linesOf = (cell, colW, sizePt) => {
    const room = colW - PAD;
    let lines = 1;
    let used = 0;
    for (const word of cell.split(/\s+/).filter((w) => w !== '')) {
        const w = textW(word, sizePt);
        const add = used === 0 ? w : used + textW(' ', sizePt) + w;
        if (add <= room || used === 0)
            used = add;
        else {
            lines += 1;
            used = w;
        }
    }
    return lines;
};
/** Column widths at `sizePt`, or undefined when a number column or a single word cannot fit. */
const columnWidths = (table, widthPt, sizePt) => {
    const grid = visible(table);
    const cols = table.header.map((_, col) => grid.map((row) => row[col] ?? ''));
    const full = cols.map((cells) => Math.max(...cells.map((c) => textW(c, sizePt))) + PAD);
    const word = cols.map((cells) => Math.max(...cells.flatMap((c) => c.split(/\s+/)).map((w) => textW(w, sizePt))) + PAD);
    const fixed = cols.reduce((sum, _, col) => (isText(table, col) ? sum : sum + (full[col] ?? 0)), 0);
    const textCols = cols.map((_, col) => col).filter((col) => isText(table, col));
    const room = widthPt - fixed;
    const natural = textCols.reduce((sum, col) => sum + (full[col] ?? 0), 0);
    if (textCols.length === 0)
        return fixed <= widthPt ? full.map((w) => (w * widthPt) / fixed) : undefined;
    /* Every text column gets at least its longest word; the rest goes to the columns that still want more. */
    const least = textCols.reduce((sum, col) => sum + (word[col] ?? 0), 0);
    const want = textCols.reduce((sum, col) => sum + (full[col] ?? 0) - (word[col] ?? 0), 0);
    const spare = room - least;
    if (spare < 0)
        return undefined;
    return full.map((w, col) => {
        if (!isText(table, col))
            return w;
        if (want <= spare)
            return w + ((spare - want) * w) / natural;
        const min = word[col] ?? 0;
        return want === 0 ? min : min + (spare * (w - min)) / want;
    });
};
/** Row heights (header first) at `sizePt` for the given column widths. */
const rowHeights = (table, colW, sizePt) => visible(table).map((row) => {
    const lines = Math.max(...row.map((cell, col) => (isText(table, col) ? linesOf(cell, colW[col] ?? 0, sizePt) : 1)));
    return sizePt * DATA_TABLE.rowEm + (lines - 1) * sizePt * DATA_TABLE.lineEm;
});
/** Height in pt the table needs at `sizePt` in a band `widthPt` wide (Infinity when it cannot be laid out). */
export const tableHeightPt = (table, sizePt, widthPt) => {
    const colW = columnWidths(table, widthPt, sizePt);
    return colW === undefined ? Infinity : rowHeights(table, colW, sizePt).reduce((a, b) => a + b, 0);
};
/** The largest size at which the table fits `widthPt` and `maxH`; throws when none does. */
export const fittedTableSizePt = (table, widthPt, maxH) => {
    for (let size = DATA_TABLE.sizePt; size >= DATA_TABLE.minPt; size -= 2) {
        if (tableHeightPt(table, size, widthPt) <= maxH)
            return size;
    }
    if (columnWidths(table, widthPt, DATA_TABLE.minPt) === undefined) {
        throw new Error(`table columns do not fit ${Math.round(widthPt)}pt at ${DATA_TABLE.minPt}pt - shorten a number cell or drop a column`);
    }
    throw new Error(`table with ${table.rows.length} rows needs ${Math.round(tableHeightPt(table, DATA_TABLE.minPt, widthPt))}pt, ` +
        `the slide has ${Math.round(maxH)}pt - split it over two slides`);
};
/** Place the table at the top of `frame` at `sizePt`. */
export const placeTable = (table, frame, sizePt) => {
    const colW = columnWidths(table, frame.w, sizePt);
    if (colW === undefined)
        throw new Error('table does not fit its frame');
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
