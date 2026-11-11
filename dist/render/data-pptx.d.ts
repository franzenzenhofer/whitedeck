import type { PlacedPill, PlacedTable } from './placed.js';
import { type BoxOptions, type Run } from './pptx-runs.js';
export interface PillOptions extends BoxOptions {
    shape: 'roundRect';
    /** Corner radius in inches. */
    rectRadius: number;
    fill: {
        color: string;
    };
    wrap: false;
}
export interface TableCell {
    text: Run[];
    options: {
        bold?: boolean;
        fill?: {
            color: string;
        };
        align: 'left' | 'center' | 'right';
    };
}
export interface TableOptions {
    x: number;
    y: number;
    w: number;
    h: number;
    colW: number[];
    rowH: number[];
    fontFace: string;
    fontSize: number;
    color: string;
    valign: 'middle';
    /** Cell margin in inches: [top, right, bottom, left]. */
    margin: [number, number, number, number];
    border: {
        type: 'solid';
        pt: number;
        color: string;
    };
}
/** What a pptxgenjs slide offers for these two objects (CustomSlide in scope-pptx satisfies it). */
export interface DataSlideTarget {
    addText(text: Run[], options: PillOptions): void;
    addTable(rows: TableCell[][], options: TableOptions): void;
}
export declare const paintPill: (slide: DataSlideTarget, p: PlacedPill) => void;
export declare const paintTable: (slide: DataSlideTarget, p: PlacedTable) => void;
