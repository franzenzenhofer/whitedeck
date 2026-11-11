import { boxOptions, hex, inch, toRuns } from './pptx-runs.js';
export const paintPill = (slide, p) => {
    slide.addText(toRuns(p.text, {}), {
        ...boxOptions(p.box),
        shape: 'roundRect',
        rectRadius: inch(p.box.h / 2),
        fill: { color: hex(p.fill) },
        wrap: false,
    });
};
const cell = (value, align, style) => ({
    text: toRuns(value, {}),
    options: { align, ...style },
});
export const paintTable = (slide, p) => {
    const pad = inch(p.padPt);
    const headerStyle = { bold: true, fill: { color: hex(p.headerFill) } };
    const rows = [p.header, ...p.rows].map((row, index) => row.map((value, col) => cell(value, p.align[col] ?? 'left', index === 0 ? headerStyle : {})));
    slide.addTable(rows, {
        x: inch(p.rect.x),
        y: inch(p.rect.y),
        w: inch(p.rect.w),
        h: inch(p.rect.h),
        colW: p.colW.map(inch),
        rowH: rows.map(() => inch(p.rowH)),
        fontFace: 'Helvetica Neue',
        fontSize: p.sizePt,
        color: hex(p.color),
        valign: 'middle',
        margin: [0, pad, 0, pad],
        border: { type: 'solid', pt: p.borderPt, color: hex(p.border) },
    });
};
