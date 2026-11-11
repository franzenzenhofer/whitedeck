import type { PlacedPill, PlacedTable } from './placed.js';
import { boxOptions, hex, inch, toRuns, type BoxOptions, type Run } from './pptx-runs.js';

/*
 * The two native objects of the data layout. A tag is ONE rounded-rectangle shape
 * with its text inside (pptx `prstGeom roundRect` + txBody): Keynote imports it as a
 * shape whose text is editable, PowerPoint the same. A table is a pptx graphicFrame
 * table, which Keynote imports as a native Keynote table.
 */
export interface PillOptions extends BoxOptions {
  shape: 'roundRect';
  /** Corner radius in inches. */
  rectRadius: number;
  fill: { color: string };
  wrap: false;
}

export interface TableCell {
  text: Run[];
  options: { bold?: boolean; fill?: { color: string }; align: 'left' | 'center' | 'right' };
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
  border: { type: 'solid'; pt: number; color: string };
}

/** What a pptxgenjs slide offers for these two objects (CustomSlide in scope-pptx satisfies it). */
export interface DataSlideTarget {
  addText(text: Run[], options: PillOptions): void;
  addTable(rows: TableCell[][], options: TableOptions): void;
}

export const paintPill = (slide: DataSlideTarget, p: PlacedPill): void => {
  slide.addText(toRuns(p.text, {}), {
    ...boxOptions(p.box),
    shape: 'roundRect',
    rectRadius: inch(p.box.h / 2),
    fill: { color: hex(p.fill) },
    wrap: false,
  });
};

const cell = (value: string, align: TableCell['options']['align'], style: Partial<TableCell['options']>): TableCell => ({
  text: toRuns(value, {}),
  options: { align, ...style },
});

export const paintTable = (slide: DataSlideTarget, p: PlacedTable): void => {
  const pad = inch(p.padPt);
  const headerStyle = { bold: true, fill: { color: hex(p.headerFill) } };
  const rows = [p.header, ...p.rows].map((row, index) =>
    row.map((value, col) => cell(value, p.align[col] ?? 'left', index === 0 ? headerStyle : {})),
  );
  slide.addTable(rows, {
    x: inch(p.rect.x),
    y: inch(p.rect.y),
    w: inch(p.rect.w),
    h: inch(p.rect.h),
    colW: p.colW.map(inch),
    rowH: rows.map(() => inch(p.rowH)),
    fontFace: 'Helvetica Neue',
    fontSize: p.sizePt,
    color: hex(p.color),
    valign: 'middle',
    margin: [0, pad, 0, pad],
    border: { type: 'solid', pt: p.borderPt, color: hex(p.border) },
  });
};
