import { inlineVisibleText } from '../parse/inline.js';
import { DATA_BODY, DATA_CLUSTER, DATA_CONCLUSION, DATA_CONCLUSION_MIN_PT, DATA_CONTEXT, DATA_CONTEXT_LINE_PT, DATA_CONTEXT_MAX_LINES, DATA_CONTEXT_MIN_PT, DATA_HEADLINE, DATA_HEADLINE_GLYPH_EM, DATA_HEADLINE_MIN_PT, DATA_HEADLINE_ONE_LINE_MIN_PT, DATA_HEADLINE_MIN_W, DATA_LOGO, DATA_PILL, DATA_SOURCE, } from '../theme/data.js';
import { evidence } from './data-evidence.js';
import { fittedSizePt, LINE_HEIGHT_EM, textHeightPt } from './fit.js';
import { requireImageSize, text } from './placed.js';
/* The data slide, placed once for every painter. Header row: headline left, tag pills
   and source logos right-aligned on the headline's centre line; context and conclusion
   under it; evidence; source line. See theme/data.ts for the anatomy. */
/** Shrink a text into its box (wrapping allowed); a text that does not fit at `minPt` is a build error. */
const fitText = (box, value, minPt, what) => {
    const visible = inlineVisibleText(value);
    const sizePt = fittedSizePt(visible, { widthPt: box.w, heightPt: box.h, sizePt: box.sizePt, minPt });
    if (textHeightPt(visible, sizePt, box.w) > box.h) {
        throw new Error(`${what} "${visible}" does not fit its ${Math.round(box.w)}x${Math.round(box.h)}pt box even at ${minPt}pt - shorten it`);
    }
    return { ...box, sizePt };
};
const textWidth = (value, sizePt, glyphEm) => value.length * sizePt * glyphEm;
const pillItem = (tag) => {
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
const logoHeight = (logo, aspect) => {
    if (logo.label !== undefined)
        return DATA_LOGO.iconH;
    return aspect < DATA_LOGO.stackedAspect ? DATA_LOGO.stackedH : DATA_LOGO.wordmarkH;
};
const logoItem = (logo) => {
    const size = requireImageSize(logo.path);
    const h = logoHeight(logo, size.w / size.h);
    const imageW = (h * size.w) / size.h;
    const labelW = logo.label === undefined ? 0 : textWidth(logo.label, DATA_LOGO.labelSizePt, DATA_LOGO.glyphEm);
    const w = imageW + (logo.label === undefined ? 0 : DATA_LOGO.labelGap + labelW);
    return {
        w,
        place: (x) => {
            const image = { kind: 'image', path: logo.path, rect: { x, y: DATA_CLUSTER.centerY - h / 2, w: imageW, h } };
            if (logo.label === undefined)
                return [image];
            const box = {
                x: x + imageW + DATA_LOGO.labelGap, y: DATA_CLUSTER.centerY - DATA_PILL.h / 2, w: labelW, h: DATA_PILL.h,
                sizePt: DATA_LOGO.labelSizePt, font: 'regular', color: DATA_LOGO.labelColor, align: 'left', vAlign: 'middle',
            };
            return [image, { ...text(box, logo.label), singleLine: true }];
        },
    };
};
/** Tags then logos, right-aligned at the margin; returns the placements and the row's left edge. */
const cluster = (slide) => {
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
const headline = (slide, clusterLeft) => {
    const right = clusterLeft < DATA_CLUSTER.right ? clusterLeft - DATA_CLUSTER.headlineGap : DATA_CLUSTER.right;
    const w = right - DATA_HEADLINE.x;
    if (w < DATA_HEADLINE_MIN_W) {
        throw new Error(`tags and logos leave the headline ${Math.round(w)}pt, it needs ${DATA_HEADLINE_MIN_W}pt - drop a tag or logo`);
    }
    const value = slide.title ?? '';
    const chars = inlineVisibleText(value).length;
    /* One line first (shrinking to DATA_HEADLINE_ONE_LINE_MIN_PT), only then two lines. */
    for (let size = DATA_HEADLINE.sizePt; size >= DATA_HEADLINE_ONE_LINE_MIN_PT; size -= 2) {
        if (chars * size * DATA_HEADLINE_GLYPH_EM <= w)
            return text({ ...DATA_HEADLINE, w, sizePt: size }, value);
    }
    /* Two lines, measured with the same wide glyph as the one-line check: Keynote must never wrap it to a third line
       (W11 QA 17 Nov 2026: three-line headlines overlapped the context line). */
    for (let size = DATA_HEADLINE_ONE_LINE_MIN_PT; size >= DATA_HEADLINE_MIN_PT; size -= 2) {
        const lines = Math.ceil((chars * size * DATA_HEADLINE_GLYPH_EM) / w);
        if (lines <= 2 && lines * size * LINE_HEIGHT_EM <= DATA_HEADLINE.h)
            return text({ ...DATA_HEADLINE, w, sizePt: size }, value);
    }
    throw new Error(`headline "${inlineVisibleText(value)}" needs more than 2 lines even at ${DATA_HEADLINE_MIN_PT}pt - shorten it`);
};
/* Context line: never shrunk; one or two lines measured with a wide glyph so Keynote never needs a third. */
const CONTEXT_GLYPH_EM = 0.52;
const contextLines = (value) => {
    const chars = inlineVisibleText(value).length;
    const lines = Math.max(1, Math.ceil((chars * DATA_CONTEXT.sizePt * CONTEXT_GLYPH_EM) / DATA_CONTEXT.w));
    if (lines > DATA_CONTEXT_MAX_LINES) {
        throw new Error(`context line "${inlineVisibleText(value)}" does not fit ${DATA_CONTEXT_MAX_LINES} lines at ${DATA_CONTEXT_MIN_PT}pt - shorten it`);
    }
    return lines;
};
/** Paint list of a data slide (without the deck logo). */
export const placeDataSlide = (slide) => {
    const row = cluster(slide);
    const conclusion = slide.conclusion ?? '';
    const lines = slide.context === undefined ? 1 : contextLines(slide.context);
    const shift = (lines - 1) * DATA_CONTEXT_LINE_PT;
    const band = { ...DATA_BODY, y: DATA_BODY.y + shift, h: DATA_BODY.h - shift };
    return [
        headline(slide, row.left),
        ...row.placed,
        ...(slide.context === undefined ? [] : [text({ ...DATA_CONTEXT, h: lines * DATA_CONTEXT_LINE_PT }, slide.context)]),
        text(fitText({ ...DATA_CONCLUSION, y: DATA_CONCLUSION.y + shift }, conclusion, DATA_CONCLUSION_MIN_PT, 'conclusion'), conclusion),
        ...evidence(slide, band),
        ...(slide.source === undefined ? [] : [text(fitText(DATA_SOURCE, slide.source, 16, 'source line'), slide.source)]),
    ];
};
