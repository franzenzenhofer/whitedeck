import { type Placed } from './scope-layout.js';
import { type PillOptions, type TableCell, type TableOptions } from './data-pptx.js';
import { type BoxOptions, type Run } from './pptx-runs.js';
export { LINK_COLOR, toRuns, type BoxOptions, type Run, type RunOptions } from './pptx-runs.js';
export interface ShapeOptions {
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: {
        color?: string;
        type?: 'none' | 'solid';
    };
    line?: {
        color: string;
        width: number;
    };
}
export interface CustomSlide {
    addText(text: Run[], options: BoxOptions | PillOptions): void;
    addTable(rows: TableCell[][], options: TableOptions): void;
    addImage(options: {
        path: string;
        x: number;
        y: number;
        w: number;
        h: number;
        hyperlink?: {
            url: string;
        };
    }): void;
    addShape(name: 'rect', options: ShapeOptions): void;
}
/** Paint one placement list onto a pptx slide. */
export declare const paintPlaced: (slide: CustomSlide, placed: readonly Placed[]) => void;
export declare const ptToEmuExact: (pt: number) => number;
