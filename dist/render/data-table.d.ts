import type { DeckTable } from '../parse/deck.js';
import type { PtRect } from '../theme/scope.js';
import type { PlacedTable } from './placed.js';
/** Height in pt the table needs at `sizePt`. */
export declare const tableHeightPt: (table: DeckTable, sizePt: number) => number;
/** The largest size at which the table fits `frame` (width) and `maxH`; throws when none does. */
export declare const fittedTableSizePt: (table: DeckTable, widthPt: number, maxH: number) => number;
/** Place the table at the top of `frame` at `sizePt`. */
export declare const placeTable: (table: DeckTable, frame: PtRect, sizePt: number) => PlacedTable;
