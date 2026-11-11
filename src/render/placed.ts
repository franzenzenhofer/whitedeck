import type { CellAlign, DeckBullet, DeckColumn } from '../parse/deck.js';
import { parseInline } from '../parse/inline.js';
import type { PtRect, PtText } from '../theme/scope.js';
import { imageSize } from './geometry.js';

/* Everything a custom layout paints, in points, in paint order. The three
   painters (CSS/HTML, pptx, Keynote) consume this list and never compute
   geometry themselves - one truth, three outputs. */
export interface PlacedText {
  readonly kind: 'text';
  readonly box: PtText;
  /** Inline markdown: links, **bold**, [x]{#rrggbb}. */
  readonly text: string;
  /** One line, never wrapped (logo labels): the box is sized to the text. */
  readonly singleLine?: true;
}
export interface PlacedBullets {
  readonly kind: 'bullets';
  readonly box: PtText;
  readonly bullets: readonly DeckBullet[];
  readonly spaceBeforePt: number;
  readonly indentPt: number;
  readonly bulletSizePct: number;
}
export interface PlacedNotes {
  readonly kind: 'notes';
  readonly box: PtRect;
  readonly sizePt: number;
  /** Paragraph gap at `sizePt` - NOTES.spaceBeforePt scaled down with the text. */
  readonly gapPt: number;
  readonly columns: readonly DeckColumn[];
}
export interface PlacedImage {
  readonly kind: 'image';
  readonly path: string;
  readonly rect: PtRect;
  readonly border?: string;
  /** The screenshot links to the test result (caption link) or the page (scope link). */
  readonly url?: string;
}
export interface PlacedRect {
  readonly kind: 'rect';
  readonly rect: PtRect;
  readonly fill: string;
}
/** A tag: text inside a filled rounded rectangle - ONE shape, its text editable. */
export interface PlacedPill {
  readonly kind: 'pill';
  readonly box: PtText;
  readonly text: string;
  readonly fill: string;
}
/** A native table: every cell is text (inline markdown), column widths in pt. */
export interface PlacedTable {
  readonly kind: 'table';
  readonly rect: PtRect;
  readonly sizePt: number;
  readonly rowH: number;
  readonly colW: readonly number[];
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly align: readonly CellAlign[];
  readonly padPt: number;
  readonly headerFill: string;
  readonly border: string;
  readonly borderPt: number;
  readonly color: string;
}
export type Placed = PlacedText | PlacedBullets | PlacedNotes | PlacedImage | PlacedRect | PlacedPill | PlacedTable;

/** Pixel size of a picture, or a loud error naming the file. */
export const requireImageSize = (path: string): { w: number; h: number } => {
  const size = imageSize(path);
  if (size === undefined || size.w === 0 || size.h === 0) {
    throw new Error(`image is not a readable PNG or JPEG: ${path}`);
  }
  return size;
};

/** Contain-fit an image into a frame; a right-aligned fit keeps the right edge. */
export const fitInto = (path: string, frame: PtRect, alignRight = false): PtRect => {
  const size = requireImageSize(path);
  const scale = Math.min(frame.w / size.w, frame.h / size.h);
  const w = size.w * scale;
  const h = size.h * scale;
  const x = alignRight ? frame.x + frame.w - w : frame.x + (frame.w - w) / 2;
  return { x, y: frame.y + (frame.h - h) / 2, w, h };
};

export const text = (box: PtText, value: string): PlacedText => ({ kind: 'text', box, text: value });

/** The first link target in inline markdown: a picture links to where its data lives. */
export const firstUrl = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : parseInline(value).find((seg) => seg.url !== undefined)?.url;
