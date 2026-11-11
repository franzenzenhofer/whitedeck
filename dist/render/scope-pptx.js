import { BORDER_PT, EMU_PER_PT } from '../theme/scope.js';
import { NOTE_STYLE } from './scope-layout.js';
import { paintPill, paintTable } from './data-pptx.js';
import { boxOptions, hex, toRuns } from './pptx-runs.js';
export { LINK_COLOR, toRuns } from './pptx-runs.js';
const PT_PER_INCH = 72;
const inch = (pt) => pt / PT_PER_INCH;
const BULLET_CODE = '2022';
const paintText = (slide, p) => {
    slide.addText(toRuns(p.text, {}), { ...boxOptions(p.box), ...(p.singleLine === true && { wrap: false }) });
};
const bulletRuns = (bullets, indentPt, spaceBeforePt) => bullets.flatMap((b, index) => toRuns(b.text, {
    bullet: { code: BULLET_CODE, indent: indentPt },
    indentLevel: b.level,
    breakLine: true,
    ...(index > 0 && { paraSpaceBefore: spaceBeforePt }),
}));
const paintBullets = (slide, p) => {
    slide.addText(bulletRuns(p.bullets, p.indentPt, p.spaceBeforePt), { ...boxOptions(p.box), fit: 'shrink' });
};
const paintNotes = (slide, p) => {
    const indentPt = Math.round(p.sizePt * NOTE_STYLE.indentEm);
    const runs = p.columns.flatMap((col, index) => [
        { text: col.header, options: { bold: true, breakLine: true, ...(index > 0 && { paraSpaceBefore: p.gapPt }) } },
        ...bulletRuns(col.bullets, indentPt, p.gapPt).map((r) => ({
            ...r,
            options: { ...r.options, paraSpaceBefore: p.gapPt },
        })),
    ]);
    const box = { ...p.box, sizePt: p.sizePt, font: 'regular', color: '#000000', align: 'left', vAlign: 'top' };
    slide.addText(runs, { ...boxOptions(box), fit: 'shrink' });
};
const paintImage = (slide, p) => {
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
const paintRect = (slide, rect, fill) => {
    slide.addShape('rect', { x: inch(rect.x), y: inch(rect.y), w: inch(rect.w), h: inch(rect.h), fill: { color: hex(fill) } });
};
/** Paint one placement list onto a pptx slide. */
export const paintPlaced = (slide, placed) => {
    for (const p of placed) {
        if (p.kind === 'text')
            paintText(slide, p);
        else if (p.kind === 'bullets')
            paintBullets(slide, p);
        else if (p.kind === 'notes')
            paintNotes(slide, p);
        else if (p.kind === 'image')
            paintImage(slide, p);
        else if (p.kind === 'pill')
            paintPill(slide, p);
        else if (p.kind === 'table')
            paintTable(slide, p);
        else
            paintRect(slide, p.rect, p.fill);
    }
};
export const ptToEmuExact = (pt) => Math.round(pt * EMU_PER_PT);
