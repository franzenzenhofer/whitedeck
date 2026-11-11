import type { PtText } from '../theme/scope.js';
export interface RunOptions {
    bold?: boolean;
    color?: string;
    hyperlink?: {
        url: string;
    };
    underline?: {
        style: 'sng';
    };
    breakLine?: boolean;
    bullet?: {
        code: string;
        indent?: number;
    } | boolean;
    indentLevel?: number;
    paraSpaceBefore?: number;
    fontFace?: string;
}
export interface Run {
    text: string;
    options: RunOptions;
}
export interface BoxOptions {
    x: number;
    y: number;
    w: number;
    h: number;
    fontSize: number;
    fontFace: string;
    color: string;
    align: 'left' | 'center' | 'right';
    valign: 'top' | 'middle' | 'bottom';
    margin: number;
    fit?: 'shrink';
    fill?: {
        color: string;
    };
    /** false = one line, never wrapped (wrap="none"). */
    wrap?: boolean;
}
export declare const PT_PER_INCH = 72;
export declare const inch: (pt: number) => number;
export declare const LINK_COLOR = "0000EE";
export declare const hex: (color: string) => string;
/**
 * Inline markdown to pptx runs: links blue + underlined, bold as a real bold
 * run, `[x]{#rrggbb}` as a coloured run. Shared with the Keynote-geometry
 * layouts through pptx.ts.
 */
export declare const toRuns: (text: string, para: RunOptions) => Run[];
export declare const boxOptions: (t: PtText) => BoxOptions;
