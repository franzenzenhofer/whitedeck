import { BLACK, CAPTION_GREY, MARGIN_PT, SLIDE_W_PT, type PtRect, type PtText } from './scope.js';

/*
 * Geometry of the `data` layout, in points on the 1920x1080 pt slide - the anatomy of
 * the skill's rule "HEADLINE = WHAT WE LOOK AT, CONCLUSION BELOW IT":
 *
 *   [headline .................................] [tag] [tag] [logo] [icon label]
 *   context line (small, grey)
 *   conclusion line (the finding)
 *   [ evidence: 1-3 images side by side | a native table | images over a table | bullets ]
 *   source line                                                          [deck logo]
 *
 * Every element sits at the same place on every data slide. Proportions follow the
 * f19n frame used in the 2026 Red Bull and IS24 decks (headline 48-56 pt, conclusion
 * ~ 2/3 of it, grey pills, logos centred on the headline's first line).
 */
const CONTENT_W = SLIDE_W_PT - 2 * MARGIN_PT;
const RIGHT = MARGIN_PT + CONTENT_W;
const TEXT_GREY = '#3c4043';

/** Headline box; its width is what the tags and logos leave free. */
export const DATA_HEADLINE: PtText = {
  x: MARGIN_PT, y: 30, w: CONTENT_W, h: 100, sizePt: 56, font: 'medium', color: BLACK, align: 'left', vAlign: 'middle',
};
/** A headline shrinks on one line down to this size, then wraps to two lines (down to DATA_HEADLINE_MIN_PT). */
export const DATA_HEADLINE_ONE_LINE_MIN_PT = 40;
/* One-line check: Helvetica Neue Medium measured 0.50 em per glyph on a mixed-case
   headline in Chrome (11 Nov 2026); 0.54 keeps Keynote and PowerPoint from wrapping it. */
export const DATA_HEADLINE_GLYPH_EM = 0.54;
export const DATA_HEADLINE_MIN_PT = 32;
/** The headline never gets narrower than this; more tags/logos is a build error. */
export const DATA_HEADLINE_MIN_W = 760;

/** Tags + logos: one row, right-aligned at the margin, centred on this y. */
export const DATA_CLUSTER = { right: RIGHT, centerY: 82, gap: 18, headlineGap: 36 } as const;

export const DATA_PILL = {
  h: 46, sizePt: 24, padX: 22, font: 'medium', fill: '#e8eaed', color: TEXT_GREY, glyphEm: 0.56,
} as const;

export const DATA_LOGO = {
  wordmarkH: 42, stackedH: 64, stackedAspect: 3, iconH: 46, labelSizePt: 24, labelGap: 10, labelColor: CAPTION_GREY, glyphEm: 0.56,
} as const;

export const DATA_CONTEXT: PtText = {
  x: MARGIN_PT, y: 140, w: CONTENT_W, h: 36, sizePt: 24, font: 'light', color: CAPTION_GREY, align: 'left', vAlign: 'middle',
};

export const DATA_CONCLUSION: PtText = {
  x: MARGIN_PT, y: 184, w: CONTENT_W, h: 86, sizePt: 34, font: 'regular', color: TEXT_GREY, align: 'left', vAlign: 'top',
};
export const DATA_CONCLUSION_MIN_PT = 24;

/** Evidence band: images, table, or bullets. */
export const DATA_BODY: PtRect = { x: MARGIN_PT, y: 288, w: CONTENT_W, h: 700 };
export const DATA_IMAGE_GAP = 36;

export const DATA_TABLE = {
  sizePt: 24, minPt: 16, rowEm: 1.9, padPt: 10, gapAbove: 24,
  headerFill: '#f2f2f2', border: '#c8c8c8', borderPt: 1, color: BLACK,
} as const;

export const DATA_BULLETS = { sizePt: 40, minPt: 24, spaceBeforePt: 24, indentPt: 40, bulletSizePct: 125 } as const;

/** Source line; stops short of the deck logo bottom-right. */
export const DATA_SOURCE: PtText = {
  x: MARGIN_PT, y: 1006, w: 1776, h: 44, sizePt: 20, font: 'light', color: '#666666', align: 'left', vAlign: 'middle',
};
