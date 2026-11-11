import { inlineVisibleText } from '../parse/inline.js';
import { DATA_TABLE } from '../theme/data.js';
import { AVG_GLYPH_EM } from './fit.js';
/*
 * A native table in the data layout's evidence band. Columns share the width in
 * proportion to their longest cell; every cell stays on one line. The text shrinks
 * (2 pt steps, never below DATA_TABLE.minPt) until every cell fits its column and the
 * table fits its height - otherwise the build fails naming the cell, never a table
 * that runs off the slide or wraps into rows Keynote and the PDF draw differently.
 */
const MIN_COL_CHARS = 3;
/* A cell's text is measured a little wider than a headline glyph: digits and
   capitals in table cells run wider than the average prose glyph. */
const CELL_GLYPH_EM = AVG_GLYPH_EM + 0.06;
const visible = (table) => [table.header, ...table.rows].map((row) => row.map((cell) => inlineVisibleText(cell)));
const columnWidths = (table, widthPt) => {
    const grid = visible(table);
    const chars = table.header.map((_, col) => Math.max(MIN_COL_CHARS, ...grid.map((row) => (row[col] ?? '').length)));
    const total = chars.reduce((a, b) => a + b, 0);
    return chars.map((c) => (widthPt * c) / total);
};
const widestOverflow = (table, colW, sizePt) => {
    for (const row of visible(table)) {
        for (const [col, cell] of row.entries()) {
            const need = cell.length * sizePt * CELL_GLYPH_EM + 2 * DATA_TABLE.padPt;
            if (need > (colW[col] ?? 0))
                return cell;
        }
    }
    return undefined;
};
/** Height in pt the table needs at `sizePt`. */
export const tableHeightPt = (table, sizePt) => (table.rows.length + 1) * sizePt * DATA_TABLE.rowEm;
/** The largest size at which the table fits `frame` (width) and `maxH`; throws when none does. */
export const fittedTableSizePt = (table, widthPt, maxH) => {
    const colW = columnWidths(table, widthPt);
    for (let size = DATA_TABLE.sizePt; size >= DATA_TABLE.minPt; size -= 2) {
        if (widestOverflow(table, colW, size) === undefined && tableHeightPt(table, size) <= maxH)
            return size;
    }
    const cell = widestOverflow(table, colW, DATA_TABLE.minPt);
    if (cell !== undefined) {
        throw new Error(`table cell "${cell}" does not fit its column even at ${DATA_TABLE.minPt}pt - shorten it or drop a column`);
    }
    throw new Error(`table with ${table.rows.length} rows needs ${Math.round(tableHeightPt(table, DATA_TABLE.minPt))}pt, ` +
        `the slide has ${Math.round(maxH)}pt - split it over two slides`);
};
/** Place the table at the top of `frame` at `sizePt`. */
export const placeTable = (table, frame, sizePt) => {
    const rowH = sizePt * DATA_TABLE.rowEm;
    return {
        kind: 'table',
        rect: { x: frame.x, y: frame.y, w: frame.w, h: tableHeightPt(table, sizePt) },
        sizePt,
        rowH,
        colW: columnWidths(table, frame.w),
        header: table.header,
        rows: table.rows,
        align: table.align,
        padPt: DATA_TABLE.padPt,
        headerFill: DATA_TABLE.headerFill,
        border: DATA_TABLE.border,
        borderPt: DATA_TABLE.borderPt,
        color: DATA_TABLE.color,
    };
};
