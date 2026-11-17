import { inlineToHtml } from '../parse/inline.js';
import { ptToPx, type PtText } from '../theme/scope.js';
import type { PlacedPill, PlacedTable } from './placed.js';

/* The data layout's pill and table for the HTML/PDF path, at the geometry the
   pptx and Keynote get (placed.ts). */

const FONT_WEIGHT: Readonly<Record<PtText['font'], number>> = { light: 300, regular: 400, medium: 500, bold: 700 };

export const pillHtml = (p: PlacedPill): string => {
  const b = p.box;
  const style =
    `position:absolute;left:${ptToPx(b.x)}px;top:${ptToPx(b.y)}px;width:${ptToPx(b.w)}px;height:${ptToPx(b.h)}px;` +
    `border-radius:${ptToPx(b.h / 2)}px;background:${p.fill};color:${b.color};font-size:${b.sizePt}pt;` +
    `font-weight:${FONT_WEIGHT[b.font]};display:flex;align-items:center;justify-content:center;white-space:nowrap;line-height:1;`;
  return `<div class="wd-text wd-pill" style="${style}">${inlineToHtml(p.text)}</div>`;
};

const cellHtml = (tag: 'th' | 'td', value: string, p: PlacedTable, at: { col: number; rowH: number }): string => {
  const { col, rowH } = at;
  /* Number cells never wrap; a number header may wrap at a space only when data-table.ts sized it so; no cell ever
     breaks inside a word. */
  const wrap = tag === 'td' && (p.align[col] ?? 'left') !== 'left' ? 'nowrap' : 'normal';
  const style =
    `width:${ptToPx(p.colW[col] ?? 0)}px;height:${ptToPx(rowH)}px;padding:0 ${p.padRightPt}pt 0 ${p.padLeftPt}pt;` +
    `text-align:${p.align[col] ?? 'left'};border:${p.borderPt}pt solid ${p.border};white-space:${wrap};` +
    'overflow-wrap:normal;word-break:keep-all;hyphens:none;box-sizing:border-box;' +
    (tag === 'th' ? `background:${p.headerFill};font-weight:700;` : 'font-weight:400;');
  return `<${tag} style="${style}">${inlineToHtml(value)}</${tag}>`;
};

export const tableHtml = (p: PlacedTable): string => {
  const head = `<tr>${p.header.map((v, col) => cellHtml('th', v, p, { col, rowH: p.rowHs[0] ?? 0 })).join('')}</tr>`;
  const body = p.rows
    .map((row, r) => `<tr>${row.map((v, col) => cellHtml('td', v, p, { col, rowH: p.rowHs[r + 1] ?? 0 })).join('')}</tr>`)
    .join('');
  const style =
    `position:absolute;left:${ptToPx(p.rect.x)}px;top:${ptToPx(p.rect.y)}px;width:${ptToPx(p.rect.w)}px;` +
    `border-collapse:collapse;table-layout:fixed;font-size:${p.sizePt}pt;color:${p.color};line-height:1.15;`;
  return `<table class="wd-text wd-table" style="${style}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
};
