/** A header logo: a picture, and its name as text beside it (icons) or none (wordmarks). */
export interface DeckLogo {
    readonly path: string;
    readonly label?: string;
}
export type CellAlign = 'left' | 'center' | 'right';
/** A GFM table, cells as inline markdown. */
export interface DeckTable {
    readonly header: readonly string[];
    readonly rows: readonly (readonly string[])[];
    readonly align: readonly CellAlign[];
}
export declare const DATA_FIELD: RegExp;
export declare const parseTags: (value: string) => string[];
export declare const parseLogos: (value: string) => DeckLogo[];
/** Table lines (header, delimiter, rows) to a DeckTable; a ragged row is an error, never a guess. */
export declare const parseTable: (lines: readonly string[]) => DeckTable;
