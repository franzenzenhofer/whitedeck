import type { DeckBullet } from '../parse/deck.js';
import { BORDER_PT, EMU_PER_PT, type PtRect, type PtText } from '../theme/scope.js';
import { NOTE_STYLE, type Placed, type PlacedBullets, type PlacedImage, type PlacedNotes, type PlacedText } from './scope-layout.js';
import { paintPill, paintTable, type PillOptions, type TableCell, type TableOptions } from './data-pptx.js';
import { boxOptions, hex, toRuns, type BoxOptions, type Run } from './pptx-runs.js';

export { LINK_COLOR, toRuns, type BoxOptions, type Run, type RunOptions } from './pptx-runs.js';

export interface ShapeOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: { color?: string; type?: 'none' | 'solid' };
  line?: { color: string; width: number };
}
export interface CustomSlide {
  addText(text: Run[], options: BoxOptions | PillOptions): void;
  addTable(rows: TableCell[][], options: TableOptions): void;
  addImage(options: { path: string; x: number; y: number; w: number; h: number; hyperlink?: { url: string } }): void;
  addShape(name: 'rect', options: ShapeOptions): void;
}

const PT_PER_INCH = 72;
const inch = (pt: number): number => pt / PT_PER_INCH;
const BULLET_CODE = '2022';

const paintText = (slide: CustomSlide, p: PlacedText): void => {
  slide.addText(toRuns(p.text, {}), { ...boxOptions(p.box), ...(p.singleLine === true && { wrap: false }) });
};

const bulletRuns = (bullets: readonly DeckBullet[], indentPt: number, spaceBeforePt: number): Run[] =>
  bullets.flatMap((b, index) =>
    toRuns(b.text, {
      bullet: { code: BULLET_CODE, indent: indentPt },
      indentLevel: b.level,
      breakLine: true,
      ...(index > 0 && { paraSpaceBefore: spaceBeforePt }),
    }),
  );

const paintBullets = (slide: CustomSlide, p: PlacedBullets): void => {
  slide.addText(bulletRuns(p.bullets, p.indentPt, p.spaceBeforePt), { ...boxOptions(p.box), fit: 'shrink' });
};

const paintNotes = (slide: CustomSlide, p: PlacedNotes): void => {
  const indentPt = Math.round(p.sizePt * NOTE_STYLE.indentEm);
  const runs = p.columns.flatMap((col, index) => [
    { text: col.header, options: { bold: true, breakLine: true, ...(index > 0 && { paraSpaceBefore: p.gapPt }) } },
    ...bulletRuns(col.bullets, indentPt, p.gapPt).map((r) => ({
      ...r,
      options: { ...r.options, paraSpaceBefore: p.gapPt },
    })),
  ]);
  const box: PtText = { ...p.box, sizePt: p.sizePt, font: 'regular', color: '#000000', align: 'left', vAlign: 'top' };
  slide.addText(runs, { ...boxOptions(box), fit: 'shrink' });
};

const paintImage = (slide: CustomSlide, p: PlacedImage): void => {
  const r = p.rect;
  slide.addImage({ path: p.path, x: inch(r.x), y: inch(r.y), w: inch(r.w), h: inch(r.h), ...(p.url !== undefined && { hyperlink: { url: p.url } }) });
  if (p.border !== undefined) {
    /* The stroke is centred on the picture edge, like the Keynote original. */
    slide.addShape('rect', {
      x: inch(r.x),
      y: inch(r.y),
      w: inch(r.w),
      h: inch(r.h),
      fill: { type: 'none' },
      line: { color: hex(p.border), width: BORDER_PT },
    });
  }
};

const paintRect = (slide: CustomSlide, rect: PtRect, fill: string): void => {
  slide.addShape('rect', { x: inch(rect.x), y: inch(rect.y), w: inch(rect.w), h: inch(rect.h), fill: { color: hex(fill) } });
};

/** Paint one placement list onto a pptx slide. */
export const paintPlaced = (slide: CustomSlide, placed: readonly Placed[]): void => {
  for (const p of placed) {
    if (p.kind === 'text') paintText(slide, p);
    else if (p.kind === 'bullets') paintBullets(slide, p);
    else if (p.kind === 'notes') paintNotes(slide, p);
    else if (p.kind === 'image') paintImage(slide, p);
    else if (p.kind === 'pill') paintPill(slide, p);
    else if (p.kind === 'table') paintTable(slide, p);
    else paintRect(slide, p.rect, p.fill);
  }
};

export const ptToEmuExact = (pt: number): number => Math.round(pt * EMU_PER_PT);
