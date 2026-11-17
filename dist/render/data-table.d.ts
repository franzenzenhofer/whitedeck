import type { DeckTable } from '../parse/deck.js';
import type { PtRect } from '../theme/scope.js';
import type { PlacedTable } from './placed.js';
/** Height in pt the table needs at `sizePt` in a band `widthPt` wide (Infinity when it cannot be laid out). */
export declare const tableHeightPt: (table: DeckTable, sizePt: number, widthPt: number) => number;
/** The largest size at which the table fits `widthPt` and `maxH`; throws when none does. */
export declare const fittedTableSizePt: (table: DeckTable, widthPt: number, maxH: number) => number;
/** Place the table at the top of `frame` at `sizePt`. */
export declare const placeTable: (table: DeckTable, frame: PtRect, sizePt: number) => PlacedTable;
