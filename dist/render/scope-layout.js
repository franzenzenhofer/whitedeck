import { BLACK, CAPTION, COMPARE, DATA_LAYOUT_ID, HEADER_RULE, LABEL_BLUE, LABEL_TEXT, LOGO, NOTES, SCOPE_LABEL, SCOPE_TEXT, SCOPE_TITLE, SECTION_LEFT, SHOT_FRAME, SHOT_NOTES, SHOT_SIDE, TITLE_BULLETS_LEFT, TITLE_LEFT, TOOL_LOGO, compareColumn, compareLabelBar, compareNotes, isCustomLayout, isScopeLayout, } from '../theme/scope.js';
import { inlineVisibleText } from '../parse/inline.js';
import { AVG_GLYPH_EM, fittedNotesSizePt, fittedSizePt, notesHeightPt, scaledGapPt } from './fit.js';
import { placeDataSlide } from './data-layout.js';
import { firstUrl, fitInto, text } from './placed.js';
const image = (img, frame, url) => ({
    kind: 'image',
    path: img.path,
    rect: fitInto(img.path, frame),
    ...(img.border !== undefined && { border: img.border }),
    ...(url !== undefined && { url }),
});
/* Headlines shrink like Keynote placeholders do; the same size then reaches
   every painter through the box. */
const MIN_TITLE_PT = 40;
const fittedTitle = (box, value) => text({ ...box, sizePt: fittedSizePt(inlineVisibleText(value), { widthPt: box.w, heightPt: box.h, sizePt: box.sizePt, minPt: MIN_TITLE_PT }) }, value);
const logo = (meta) => meta.logo === undefined ? [] : [{ kind: 'image', path: meta.logo, rect: fitInto(meta.logo, LOGO) }];
/* scope-title: one-line - the largest size (0.1pt steps, never above the layout size) at which the headline is
   ONE line by the shared glyph estimate; a headline that would need less than 30pt is a build error, not a wrap. */
const MIN_ONE_LINE_PT = 30;
const oneLineTitle = (box, value) => {
    const chars = inlineVisibleText(value).length;
    const size = Math.min(box.sizePt, Math.floor((box.w / (chars * AVG_GLYPH_EM)) * 10) / 10);
    if (size < MIN_ONE_LINE_PT) {
        throw new Error(`headline needs ${size}pt to stay on one line (min ${MIN_ONE_LINE_PT}pt) - shorten it: ${value}`);
    }
    return text({ ...box, sizePt: size }, value);
};
const header = (slide, meta) => [
    text(SCOPE_TEXT, `**${SCOPE_LABEL}** ${slide.scope ?? ''}`),
    ...(slide.tool === undefined
        ? []
        : [{ kind: 'image', path: slide.tool, rect: fitInto(slide.tool, TOOL_LOGO, true) }]),
    { kind: 'rect', rect: HEADER_RULE, fill: BLACK },
    ...(slide.title === undefined
        ? []
        : [meta.scopeTitle === 'one-line' ? oneLineTitle(SCOPE_TITLE, slide.title) : fittedTitle(SCOPE_TITLE, slide.title)]),
];
const caption = (slide) => slide.caption === undefined ? [] : [text(CAPTION, slide.caption)];
/* One label bar per run of consecutive images sharing a label - "JS on" over
   two screenshots, "JS off" over the third. */
const labelBars = (images) => {
    const placed = [];
    let start = 0;
    images.forEach((img, index) => {
        const next = images[index + 1];
        if (next !== undefined && next.label === img.label)
            return;
        const rect = compareLabelBar(start, index);
        placed.push({ kind: 'rect', rect, fill: LABEL_BLUE });
        placed.push(text({ ...rect, sizePt: COMPARE.labelSizePt, font: 'medium', color: LABEL_TEXT, align: 'center', vAlign: 'middle' }, img.label ?? ''));
        start = index + 1;
    });
    return placed;
};
/* A long IS / SHOULD block shrinks like a Keynote body placeholder would;
   the gap between paragraphs shrinks with it (NOTES.spaceBeforePt scaled). */
const MIN_NOTES_PT = 20;
/* Text is never painted outside its box: a block that does not fit even at
   the minimum size is a build error naming the offending lines, not a slide
   with text running into the caption (seen 2026-09-11 on a GSC slide). */
const notes = (box, sizePt, columns) => {
    if (columns === undefined || columns.length === 0)
        return [];
    const groups = columns.map((c) => ({ header: inlineVisibleText(c.header), lines: c.bullets.map((b) => inlineVisibleText(b.text)) }));
    const fit = fittedNotesSizePt(groups, { widthPt: box.w, heightPt: box.h, sizePt, minPt: MIN_NOTES_PT }, NOTES.spaceBeforePt);
    const gapPt = scaledGapPt(NOTES.spaceBeforePt, fit, sizePt);
    const heightPt = notesHeightPt(groups, box.w, fit, gapPt);
    if (heightPt > box.h) {
        const lines = groups.flatMap((g) => [g.header, ...g.lines]).join(' / ');
        throw new Error(`notes block does not fit its ${Math.round(box.w)}x${Math.round(box.h)}pt box even at ${MIN_NOTES_PT}pt ` +
            `(needs ${Math.round(heightPt)}pt) - shorten or drop lines: ${lines}`);
    }
    return [{ kind: 'notes', box, sizePt: fit, gapPt, columns }];
};
const scopeShot = (slide) => {
    const only = slide.images[0];
    if (only === undefined)
        throw new Error('scope-shot needs one image');
    return [image(only, SHOT_FRAME, firstUrl(slide.caption) ?? firstUrl(slide.scope))];
};
const scopeCompare = (slide) => [
    ...labelBars(slide.images),
    ...slide.images.map((img, index) => image(img, compareColumn(index), firstUrl(slide.scope))),
    ...notes(compareNotes(slide.images.length), COMPARE.notesSizePt, slide.columns),
];
const scopeShotNotes = (slide, geo = SHOT_NOTES) => {
    const [main, side] = slide.images;
    if (main === undefined || side === undefined)
        throw new Error(`${slide.layout} needs two images`);
    const url = firstUrl(slide.caption) ?? firstUrl(slide.scope);
    return [
        image(main, geo.main, url),
        image(side, geo.side, url),
        ...notes(geo.notes, geo.notesSizePt, slide.columns),
    ];
};
const scopeBody = (slide) => {
    if (slide.layout === 'scope-shot')
        return scopeShot(slide);
    if (slide.layout === 'scope-compare')
        return scopeCompare(slide);
    if (slide.layout === 'scope-shot-side')
        return scopeShotNotes(slide, SHOT_SIDE);
    return scopeShotNotes(slide);
};
const titleLeft = (slide) => [
    ...(slide.title === undefined ? [] : [fittedTitle(TITLE_LEFT.title, slide.title)]),
    ...(slide.subtitle === undefined ? [] : [text(TITLE_LEFT.subtitle, slide.subtitle)]),
    ...(slide.footer === undefined ? [] : [text(TITLE_LEFT.footer, slide.footer)]),
];
const sectionLeft = (slide) => [
    ...(slide.title === undefined ? [] : [fittedTitle(SECTION_LEFT.title, slide.title)]),
    ...(slide.subtitle === undefined ? [] : [text(SECTION_LEFT.subtitle, slide.subtitle)]),
];
const titleBulletsLeft = (slide) => [
    ...(slide.title === undefined ? [] : [fittedTitle(TITLE_BULLETS_LEFT.title, slide.title)]),
    ...(slide.bullets.length === 0
        ? []
        : [
            {
                kind: 'bullets',
                box: TITLE_BULLETS_LEFT.body,
                bullets: slide.bullets,
                spaceBeforePt: TITLE_BULLETS_LEFT.spaceBeforePt,
                indentPt: TITLE_BULLETS_LEFT.indentPt,
                bulletSizePct: TITLE_BULLETS_LEFT.bulletSizePct,
            },
        ]),
];
const leftBody = (slide) => {
    if (slide.layout === 'title-left')
        return titleLeft(slide);
    if (slide.layout === 'section-left')
        return sectionLeft(slide);
    return titleBulletsLeft(slide);
};
/**
 * Paint list of a custom (scope / left) layout slide. Throws for any other
 * layout - callers branch on `isCustomLayout` first.
 */
export const placeCustomSlide = (slide, meta) => {
    if (!isCustomLayout(slide.layout))
        throw new Error(`${slide.layout} is not a custom layout`);
    try {
        if (slide.layout === DATA_LAYOUT_ID)
            return [...placeDataSlide(slide), ...logo(meta)];
        if (isScopeLayout(slide.layout))
            return [...header(slide, meta), ...scopeBody(slide), ...caption(slide), ...logo(meta)];
        return [...leftBody(slide), ...logo(meta)];
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`slide "${slide.title ?? slide.layout}": ${message}`);
    }
};
/** The logo alone - painted on the Keynote-geometry layouts too. */
export const placeLogo = (meta) => logo(meta);
export const NOTE_STYLE = NOTES;
