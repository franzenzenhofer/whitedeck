import { parseInline } from '../parse/inline.js';
export const PT_PER_INCH = 72;
export const inch = (pt) => pt / PT_PER_INCH;
export const LINK_COLOR = '0000EE';
const FONT_FACE = {
    regular: 'Helvetica Neue',
    medium: 'Helvetica Neue Medium',
    light: 'Helvetica Neue Light',
    bold: 'Helvetica Neue Bold',
};
export const hex = (color) => color.replace('#', '').toUpperCase();
/**
 * Inline markdown to pptx runs: links blue + underlined, bold as a real bold
 * run, `[x]{#rrggbb}` as a coloured run. Shared with the Keynote-geometry
 * layouts through pptx.ts.
 */
export const toRuns = (text, para) => {
    const segments = parseInline(text);
    return segments.map((s, index) => ({
        text: s.text,
        options: {
            ...para,
            breakLine: index === segments.length - 1 ? (para.breakLine ?? false) : false,
            ...(s.url !== undefined && { hyperlink: { url: s.url }, color: LINK_COLOR, underline: { style: 'sng' } }),
            ...(s.bold === true && { bold: true }),
            ...(s.color !== undefined && { color: hex(s.color) }),
            ...(index > 0 && { bullet: false }),
        },
    }));
};
export const boxOptions = (t) => ({
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
