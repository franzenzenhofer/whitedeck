import type { DeckLogo, DeckSlide } from '../parse/deck.js';
import { inlineVisibleText } from '../parse/inline.js';
import {
  DATA_BODY,
  DATA_BULLETS,
  DATA_CLUSTER,
  DATA_CONCLUSION,
  DATA_CONCLUSION_MIN_PT,
  DATA_CONTEXT,
  DATA_HEADLINE,
  DATA_HEADLINE_GLYPH_EM,
  DATA_HEADLINE_MIN_PT,
  DATA_HEADLINE_ONE_LINE_MIN_PT,
  DATA_HEADLINE_MIN_W,
  DATA_IMAGE_GAP,
  DATA_LOGO,
  DATA_PILL,
  DATA_SOURCE,
  DATA_TABLE,
} from '../theme/data.js';
import { BLACK, type PtRect, type PtText } from '../theme/scope.js';
import { fittedTableSizePt, placeTable, tableHeightPt } from './data-table.js';
import { fittedNotesSizePt, fittedSizePt, notesHeightPt, textHeightPt } from './fit.js';
import { firstUrl, fitInto, requireImageSize, text, type Placed, type PlacedBullets, type PlacedImage } from './placed.js';

/* The data slide, placed once for every painter. Header row: headline left, tag pills
   and source logos right-aligned on the headline's centre line; context and conclusion
   under it; evidence; source line. See theme/data.ts for the anatomy. */

/** Shrink a text into its box (wrapping allowed); a text that does not fit at `minPt` is a build error. */
const fitText = (box: PtText, value: string, minPt: number, what: string): PtText => {
  const visible = inlineVisibleText(value);
  const sizePt = fittedSizePt(visible, { widthPt: box.w, heightPt: box.h, sizePt: box.sizePt, minPt });
  if (textHeightPt(visible, sizePt, box.w) > box.h) {
    throw new Error(`${what} "${visible}" does not fit its ${Math.round(box.w)}x${Math.round(box.h)}pt box even at ${minPt}pt - shorten it`);
  }
  return { ...box, sizePt };
};

const textWidth = (value: string, sizePt: number, glyphEm: number): number => value.length * sizePt * glyphEm;

interface ClusterItem {
  readonly w: number;
  readonly place: (x: number) => Placed[];
}

const pillItem = (tag: string): ClusterItem => {
  const w = textWidth(tag, DATA_PILL.sizePt, DATA_PILL.glyphEm) + 2 * DATA_PILL.padX;
  return {
    w,
    place: (x) => [{
      kind: 'pill',
      text: tag,
      fill: DATA_PILL.fill,
      box: {
        x, y: DATA_CLUSTER.centerY - DATA_PILL.h / 2, w, h: DATA_PILL.h,
        sizePt: DATA_PILL.sizePt, font: DATA_PILL.font, color: DATA_PILL.color, align: 'center', vAlign: 'middle',
      },
    }],
  };
};

/* Icons share one height; a wide one-line wordmark (Search Console) reads at the icon
   height, a stacked one (Google Analytics: two text lines) needs more to stay legible. */
const logoHeight = (logo: DeckLogo, aspect: number): number => {
  if (logo.label !== undefined) return DATA_LOGO.iconH;
  return aspect < DATA_LOGO.stackedAspect ? DATA_LOGO.stackedH : DATA_LOGO.wordmarkH;
};

const logoItem = (logo: DeckLogo): ClusterItem => {
  const size = requireImageSize(logo.path);
  const h = logoHeight(logo, size.w / size.h);
  const imageW = (h * size.w) / size.h;
  const labelW = logo.label === undefined ? 0 : textWidth(logo.label, DATA_LOGO.labelSizePt, DATA_LOGO.glyphEm);
  const w = imageW + (logo.label === undefined ? 0 : DATA_LOGO.labelGap + labelW);
  return {
    w,
    place: (x) => {
      const image: PlacedImage = { kind: 'image', path: logo.path, rect: { x, y: DATA_CLUSTER.centerY - h / 2, w: imageW, h } };
      if (logo.label === undefined) return [image];
      const box: PtText = {
        x: x + imageW + DATA_LOGO.labelGap, y: DATA_CLUSTER.centerY - DATA_PILL.h / 2, w: labelW, h: DATA_PILL.h,
        sizePt: DATA_LOGO.labelSizePt, font: 'regular', color: DATA_LOGO.labelColor, align: 'left', vAlign: 'middle',
      };
      return [image, { ...text(box, logo.label), singleLine: true }];
    },
  };
};

/** Tags then logos, right-aligned at the margin; returns the placements and the row's left edge. */
const cluster = (slide: DeckSlide): { placed: Placed[]; left: number } => {
  const items = [...(slide.tags ?? []).map(pillItem), ...(slide.logos ?? []).map(logoItem)];
  const total = items.reduce((sum, item) => sum + item.w, 0) + Math.max(items.length - 1, 0) * DATA_CLUSTER.gap;
  let x = DATA_CLUSTER.right - total;
  const left = x;
  const placed = items.flatMap((item) => {
    const out = item.place(x);
    x += item.w + DATA_CLUSTER.gap;
    return out;
  });
  return { placed, left };
};

const headline = (slide: DeckSlide, clusterLeft: number): Placed => {
  const right = clusterLeft < DATA_CLUSTER.right ? clusterLeft - DATA_CLUSTER.headlineGap : DATA_CLUSTER.right;
  const w = right - DATA_HEADLINE.x;
  if (w < DATA_HEADLINE_MIN_W) {
    throw new Error(`tags and logos leave the headline ${Math.round(w)}pt, it needs ${DATA_HEADLINE_MIN_W}pt - drop a tag or logo`);
  }
  const value = slide.title ?? '';
  const chars = inlineVisibleText(value).length;
  /* One line first (shrinking to DATA_HEADLINE_ONE_LINE_MIN_PT), only then two lines. */
  for (let size = DATA_HEADLINE.sizePt; size >= DATA_HEADLINE_ONE_LINE_MIN_PT; size -= 2) {
    if (chars * size * DATA_HEADLINE_GLYPH_EM <= w) return text({ ...DATA_HEADLINE, w, sizePt: size }, value);
  }
  const twoLines = { ...DATA_HEADLINE, w, sizePt: DATA_HEADLINE_ONE_LINE_MIN_PT };
  return text(fitText(twoLines, value, DATA_HEADLINE_MIN_PT, 'headline'), value);
};

/** 1-3 pictures side by side, each contain-fit in its share of `frame`, linked to the source. */
const images = (slide: DeckSlide, frame: PtRect): PlacedImage[] => {
  const n = slide.images.length;
  const w = (frame.w - DATA_IMAGE_GAP * (n - 1)) / n;
  const url = firstUrl(slide.source);
  return slide.images.map((img, index) => ({
    kind: 'image',
    path: img.path,
    rect: fitInto(img.path, { x: frame.x + index * (w + DATA_IMAGE_GAP), y: frame.y, w, h: frame.h }),
    ...(img.border !== undefined && { border: img.border }),
    ...(url !== undefined && { url }),
  }));
};

const MIN_IMAGE_H = 200;

/** Pictures over a table: the table takes the height it needs, the pictures the rest. */
const imagesOverTable = (slide: DeckSlide): Placed[] => {
  const table = slide.table;
  if (table === undefined) return images(slide, DATA_BODY);
  const room = DATA_BODY.h - MIN_IMAGE_H - DATA_TABLE.gapAbove;
  const sizePt = fittedTableSizePt(table, DATA_BODY.w, slide.images.length === 0 ? DATA_BODY.h : room);
  if (slide.images.length === 0) return [placeTable(table, DATA_BODY, sizePt)];
  const frame = { ...DATA_BODY, h: DATA_BODY.h - tableHeightPt(table, sizePt) - DATA_TABLE.gapAbove };
  const pictures = images(slide, frame);
  const bottom = Math.max(...pictures.map((p) => p.rect.y + p.rect.h));
  return [...pictures, placeTable(table, { ...DATA_BODY, y: bottom + DATA_TABLE.gapAbove }, sizePt)];
};

const bullets = (slide: DeckSlide): PlacedBullets => {
  const groups = slide.bullets.map((b) => ({ header: inlineVisibleText(b.text), lines: [] }));
  const widthPt = DATA_BODY.w - DATA_BULLETS.indentPt;
  const box = { widthPt, heightPt: DATA_BODY.h, sizePt: DATA_BULLETS.sizePt, minPt: DATA_BULLETS.minPt };
  const sizePt = fittedNotesSizePt(groups, box, DATA_BULLETS.spaceBeforePt);
  const gap = (DATA_BULLETS.spaceBeforePt * sizePt) / DATA_BULLETS.sizePt;
  if (notesHeightPt(groups, widthPt, sizePt, gap) > DATA_BODY.h) {
    throw new Error(`${slide.bullets.length} bullets do not fit the data slide even at ${DATA_BULLETS.minPt}pt - max 5 short bullets`);
  }
  return {
    kind: 'bullets',
    box: { ...DATA_BODY, sizePt, font: 'regular', color: BLACK, align: 'left', vAlign: 'top' },
    bullets: slide.bullets,
    spaceBeforePt: gap,
    indentPt: DATA_BULLETS.indentPt,
    bulletSizePct: DATA_BULLETS.bulletSizePct,
  };
};

const evidence = (slide: DeckSlide): Placed[] => {
  if (slide.bullets.length > 0) return [bullets(slide)];
  if (slide.images.length === 0 && slide.table === undefined) return [];
  return imagesOverTable(slide);
};

/** Paint list of a data slide (without the deck logo). */
export const placeDataSlide = (slide: DeckSlide): Placed[] => {
  const row = cluster(slide);
  const conclusion = slide.conclusion ?? '';
  return [
    headline(slide, row.left),
    ...row.placed,
    ...(slide.context === undefined ? [] : [text(fitText(DATA_CONTEXT, slide.context, 18, 'context line'), slide.context)]),
    text(fitText(DATA_CONCLUSION, conclusion, DATA_CONCLUSION_MIN_PT, 'conclusion'), conclusion),
    ...evidence(slide),
    ...(slide.source === undefined ? [] : [text(fitText(DATA_SOURCE, slide.source, 16, 'source line'), slide.source)]),
  ];
};
