import { BLACK, CAPTION_GREY, MARGIN_PT, SLIDE_W_PT } from './scope.js';
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
export const DATA_HEADLINE = {
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
export const DATA_CLUSTER = { right: RIGHT, centerY: 82, gap: 18, headlineGap: 36 };
export const DATA_PILL = {
    h: 46, sizePt: 24, padX: 22, font: 'medium', fill: '#e8eaed', color: TEXT_GREY, glyphEm: 0.56,
};
export const DATA_LOGO = {
    wordmarkH: 42, stackedH: 64, stackedAspect: 3, iconH: 46, labelSizePt: 24, labelGap: 10, labelColor: CAPTION_GREY, glyphEm: 0.56,
};
/** Context line: 36pt dark grey #333, never shrunk (Franz, 13 + 17 Nov 2026 and W11 QA: "MUCH bigger", the second most
    important line). One line of this box; a second line moves conclusion and evidence down by DATA_CONTEXT_LINE_PT,
    a third line is a build error. */
export const DATA_CONTEXT = {
    x: MARGIN_PT, y: 140, w: CONTENT_W, h: 42, sizePt: 36, font: 'regular', color: '#333333', align: 'left', vAlign: 'top',
};
export const DATA_CONTEXT_MIN_PT = 36;
export const DATA_CONTEXT_LINE_PT = 42;
export const DATA_CONTEXT_MAX_LINES = 2;
/* Positions with a one-line context; a two-line context shifts both down by DATA_CONTEXT_LINE_PT. The evidence band
   always ends at 988pt, above the source line. */
export const DATA_CONCLUSION = {
    x: MARGIN_PT, y: 190, w: CONTENT_W, h: 86, sizePt: 34, font: 'regular', color: TEXT_GREY, align: 'left', vAlign: 'top',
};
export const DATA_CONCLUSION_MIN_PT = 24;
/** Evidence band: images, table, or bullets. */
export const DATA_BODY = { x: MARGIN_PT, y: 294, w: CONTENT_W, h: 694 };
export const DATA_IMAGE_GAP = 36;
/* Tables: 24pt floor (the pptx floor of the decks), cells wrap inside their row (the row grows), number columns never
   wrap, IS red / SHOULD green. Every cell is padded 12pt left and 24pt right (pptx: paragraph indents, see pptx.ts),
   so the texts of two neighbouring columns are at least 36pt apart in PowerPoint / PDF (36pt) and at least 24pt in Keynote,
   which keeps only the right indent (Red Bull fix round 2, 17 Nov 2026: "11,188 NO", "7,089 17,381" ran together).
   Widths are estimated with glyphEm or the per-glyph Helvetica Neue widths, whichever is wider; bold text (header,
   answer words) is boldEm wider; a header WORD never splits (scope, score). */
export const DATA_TABLE = {
    sizePt: 24, minPt: 24, rowEm: 1.9, lineEm: 1.15, padLeftPt: 12, padRightPt: 24, minGapPt: 24, gapAbove: 24, glyphEm: 0.54,
    boldEm: 1.08,
    headerFill: '#f2f2f2', border: '#c8c8c8', borderPt: 1, color: BLACK, is: '#c5221f', should: '#188038',
};
/** A portrait screenshot with a table: picture left at full band height, table right (IS24 d07 p17 - p19). */
export const DATA_SIDE = { tableFrac: 0.35, gap: 36 };
/** Change values in tables: red / green, grey below this many % or pp (Google palette). */
export const DATA_CHANGE = { negative: '#d93025', positive: '#188038', same: '#80868b', sameBelow: 1 };
export const DATA_BULLETS = { sizePt: 40, minPt: 24, spaceBeforePt: 24, indentPt: 40, bulletSizePct: 125 };
/** Source line; stops short of the deck logo bottom-right. */
export const DATA_SOURCE = {
    x: MARGIN_PT, y: 1006, w: 1776, h: 44, sizePt: 20, font: 'light', color: '#666666', align: 'left', vAlign: 'middle',
};
