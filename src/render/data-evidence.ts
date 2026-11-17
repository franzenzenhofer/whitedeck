import type { DeckSlide } from '../parse/deck.js';
import { inlineVisibleText } from '../parse/inline.js';
import { DATA_BULLETS, DATA_IMAGE_GAP, DATA_SIDE, DATA_TABLE } from '../theme/data.js';
import { BLACK, type PtRect } from '../theme/scope.js';
import { fittedTableSizePt, placeTable, tableHeightPt } from './data-table.js';
import { fittedNotesSizePt, notesHeightPt } from './fit.js';
import { firstUrl, fitInto, requireImageSize, type Placed, type PlacedBullets, type PlacedImage } from './placed.js';

/* The evidence band of a data slide: pictures, a table, pictures over a table, a portrait screenshot left of its table,
   or bullets - always inside `band` (its top moves down when the context line takes two lines). */

const MIN_IMAGE_H = 200;

/** 1-3 pictures side by side, each contain-fit in its share of `frame`, linked to the source. */
const images = (slide: DeckSlide, frame: PtRect, alignLeft = false): PlacedImage[] => {
  const n = slide.images.length;
  const w = (frame.w - DATA_IMAGE_GAP * (n - 1)) / n;
  const url = firstUrl(slide.source);
  return slide.images.map((img, index) => {
    const fit = fitInto(img.path, { x: frame.x + index * (w + DATA_IMAGE_GAP), y: frame.y, w, h: frame.h });
    const rect = alignLeft ? { ...fit, x: frame.x + index * (fit.w + DATA_IMAGE_GAP) } : fit;
    return {
      kind: 'image',
      path: img.path,
      rect,
      ...(img.border !== undefined && { border: img.border }),
      ...(url !== undefined && { url }),
    };
  });
};

const portrait = (slide: DeckSlide): boolean =>
  slide.images.length > 0 && slide.images.every((img) => {
    const s = requireImageSize(img.path);
    return s.h > s.w;
  });

/** Portrait screenshots + table (IS24 d07 p17 - p19): pictures left at full band height, table right in 35 %. */
const sideBySide = (slide: DeckSlide, band: PtRect): Placed[] => {
  const table = slide.table;
  if (table === undefined) return images(slide, band);
  const tableW = band.w * DATA_SIDE.tableFrac;
  const pictures = images(slide, { ...band, w: band.w - tableW - DATA_SIDE.gap }, true);
  const right = Math.max(...pictures.map((p) => p.rect.x + p.rect.w)) + DATA_SIDE.gap;
  const frame = { x: right, y: band.y, w: Math.min(tableW, band.x + band.w - right), h: band.h };
  return [...pictures, placeTable(table, frame, fittedTableSizePt(table, frame.w, band.h))];
};

/** Pictures over a table: the table takes the height it needs, the pictures the rest. */
const imagesOverTable = (slide: DeckSlide, band: PtRect): Placed[] => {
  const table = slide.table;
  if (table === undefined) return images(slide, band);
  if (portrait(slide)) return sideBySide(slide, band);
  const room = band.h - MIN_IMAGE_H - DATA_TABLE.gapAbove;
  const sizePt = fittedTableSizePt(table, band.w, slide.images.length === 0 ? band.h : room);
  if (slide.images.length === 0) return [placeTable(table, band, sizePt)];
  const frame = { ...band, h: band.h - tableHeightPt(table, sizePt, band.w) - DATA_TABLE.gapAbove };
  const pictures = images(slide, frame);
  const bottom = Math.max(...pictures.map((p) => p.rect.y + p.rect.h));
  return [...pictures, placeTable(table, { ...band, y: bottom + DATA_TABLE.gapAbove }, sizePt)];
};

const bullets = (slide: DeckSlide, band: PtRect): PlacedBullets => {
  const groups = slide.bullets.map((b) => ({ header: inlineVisibleText(b.text), lines: [] }));
  const widthPt = band.w - DATA_BULLETS.indentPt;
  const box = { widthPt, heightPt: band.h, sizePt: DATA_BULLETS.sizePt, minPt: DATA_BULLETS.minPt };
  const sizePt = fittedNotesSizePt(groups, box, DATA_BULLETS.spaceBeforePt);
  const gap = (DATA_BULLETS.spaceBeforePt * sizePt) / DATA_BULLETS.sizePt;
  if (notesHeightPt(groups, widthPt, sizePt, gap) > band.h) {
    throw new Error(`${slide.bullets.length} bullets do not fit the data slide even at ${DATA_BULLETS.minPt}pt - max 5 short bullets`);
  }
  return {
    kind: 'bullets',
    box: { ...band, sizePt, font: 'regular', color: BLACK, align: 'left', vAlign: 'top' },
    bullets: slide.bullets,
    spaceBeforePt: gap,
    indentPt: DATA_BULLETS.indentPt,
    bulletSizePct: DATA_BULLETS.bulletSizePct,
  };
};

export const evidence = (slide: DeckSlide, band: PtRect): Placed[] => {
  if (slide.bullets.length > 0) return [bullets(slide, band)];
  if (slide.images.length === 0 && slide.table === undefined) return [];
  return imagesOverTable(slide, band);
};
