import { parseInline } from '../parse/inline.js';
import type { PtText } from '../theme/scope.js';

/* The pptxgenjs surface the custom layouts need, typed here like pptx.ts does. */
export interface RunOptions {
  bold?: boolean;
  color?: string;
  hyperlink?: { url: string };
  underline?: { style: 'sng' };
  breakLine?: boolean;
  bullet?: { code: string; indent?: number } | boolean;
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
  fill?: { color: string };
  /** false = one line, never wrapped (wrap="none"). */
  wrap?: boolean;
}
export const PT_PER_INCH = 72;
export const inch = (pt: number): number => pt / PT_PER_INCH;
export const LINK_COLOR = '0000EE';

const FONT_FACE: Readonly<Record<PtText['font'], string>> = {
  regular: 'Helvetica Neue',
  medium: 'Helvetica Neue Medium',
  light: 'Helvetica Neue Light',
  bold: 'Helvetica Neue Bold',
};

export const hex = (color: string): string => color.replace('#', '').toUpperCase();

/**
 * Inline markdown to pptx runs: links blue + underlined, bold as a real bold
 * run, `[x]{#rrggbb}` as a coloured run. Shared with the Keynote-geometry
 * layouts through pptx.ts.
 */
export const toRuns = (text: string, para: RunOptions): Run[] => {
  const segments = parseInline(text);
  return segments.map((s, index) => ({
    text: s.text,
    options: {
      ...para,
      breakLine: index === segments.length - 1 ? (para.breakLine ?? false) : false,
      ...(s.url !== undefined && { hyperlink: { url: s.url }, color: LINK_COLOR, underline: { style: 'sng' as const } }),
      ...(s.bold === true && { bold: true }),
      ...(s.color !== undefined && { color: hex(s.color) }),
      ...(index > 0 && { bullet: false }),
    },
  }));
};

export const boxOptions = (t: PtText): BoxOptions => ({
  x: inch(t.x),
  y: inch(t.y),
  w: inch(t.w),
  h: inch(t.h),
  fontSize: t.sizePt,
  fontFace: FONT_FACE[t.font],
  color: hex(t.color),
  align: t.align,
  valign: t.vAlign,
  margin: 0,
});

