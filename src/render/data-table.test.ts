import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { DATA_TABLE } from '../theme/data.js';
import { renderPptx } from './pptx.js';
import { placeCustomSlide } from './scope-layout.js';
import type { PlacedTable } from './placed.js';

/* W11 QA of the Red Bull bergwelten deck, 17 Nov 2026 (items T2 - T5): a wrapped cell stays ONE row, IS red / SHOULD
   green / answer words bold, number columns never wrap, left padding after a number column, table text never below
   24pt (the pptx floor), a portrait screenshot sits left at full height with its table right. */
const deckOf = (lines: string[]) => parseDeck(['# Search Console: tasks, Nov 2026', 'Context: scope', 'Conclusion: 1,204 of 5,880', ...lines].join('\n'));
const tableOf = (lines: string[]): PlacedTable => {
  const slide = deckOf(lines).slides[0];
  if (slide === undefined) throw new Error('no slide');
  const t = placeCustomSlide(slide, {}).find((p) => p.kind === 'table');
  if (t?.kind !== 'table') throw new Error('no table');
  return t;
};
const LONG = 'consent layer covers the first screen of 5 of 5 tested page types and Google live test render is dimmed by its backdrop, so the first screen shows no heading and no content before a touch';
const TASK = ['', '| field | task |', '| --- | --- |', `| IS | ${LONG} |`, `| SHOULD | ${LONG} |`, '| VERIFY | After the change: live test |'];

describe('data tables: wrapped cells, colours, widths (W11 T2 - T4)', () => {
  it('keeps a wrapped cell in ONE row that grows, never an extra row', () => {
    const t = tableOf(TASK);
    expect(t.rows).toHaveLength(3);
    expect(t.rowHs).toHaveLength(4);
    expect(t.rowHs[1]).toBeGreaterThan(t.rowHs[3] ?? 0);
    expect(t.rect.h).toBeCloseTo(t.rowHs.reduce((a, b) => a + b, 0));
  });

  it('paints IS cells red, SHOULD cells green, answer words bold and coloured', () => {
    const t = tableOf(TASK);
    expect(t.rows[0]?.[1]).toContain('{#c5221f}');
    expect(t.rows[1]?.[1]).toContain('{#188038}');
    const answers = tableOf(['', '| change | % | answer |', '| --- | ---: | --- |', '| drop 2025 | -44.6 % | YES, negative |', '| rise 2026 | +6.7 % | NO |']);
    expect(answers.rows[0]?.[2]).toBe('**[YES, negative]{#c5221f}**');
    expect(answers.rows[1]?.[2]).toBe('**NO**');
    expect(answers.rows[0]?.[0]).toBe('drop 2025');
    const label = tableOf(['', '| change (Search Console) | IS | change to pass |', '| --- | --- | --- |', '| drop 2025 | 420 KB | cut 200 KB |']);
    expect(label.rows[0]?.[0]).toBe('drop 2025');
    expect(label.rows[0]?.[1]).toBe('[420 KB]{#c5221f}');
    expect(label.rows[0]?.[2]).toBe('[cut 200 KB]{#188038}');
  });

  it('never wraps a number column: it is as wide as its widest cell, header included', () => {
    const t = tableOf(['', '| task | scope | % |', '| --- | ---: | ---: |', `| ${LONG} | all | +10.4 % |`]);
    const need = (s: string) => s.length * t.sizePt * DATA_TABLE.glyphEm + DATA_TABLE.padLeftPt + DATA_TABLE.padRightPt;
    expect(t.colW[1]).toBeGreaterThanOrEqual(need('scope') - 0.01);
    expect(t.colW[2]).toBeGreaterThanOrEqual(need('+10.4 %') - 0.01);
  });

  it('keeps table text at 24pt or more and pads every cell 24pt on the left', () => {
    expect(tableOf(TASK).sizePt).toBeGreaterThanOrEqual(24);
    expect(DATA_TABLE.padLeftPt).toBeGreaterThanOrEqual(24);
  });

  it('writes one pptx table row per markdown row, with the grown row height', async () => {
    const out = join(mkdtempSync(join(tmpdir(), 'whitedeck-table-')), 't.pptx');
    await renderPptx(deckOf(TASK), out);
    const xml = (await (await JSZip.loadAsync(readFileSync(out))).file('ppt/slides/slide1.xml')?.async('string')) ?? '';
    const heights = [...xml.matchAll(/<a:tr h="(\d+)"/g)].map((m) => Number(m[1]));
    expect(heights).toHaveLength(4);
    expect(heights[1]).toBeGreaterThan(heights[3] ?? 0);
  });
});

describe('data layout: portrait screenshot + table side by side (W11 T5, IS24 d07 p17 - p19)', () => {
  it('puts a portrait image left at full evidence height and the table right in at most 35 % plus the gap', () => {
    const dir = mkdtempSync(join(tmpdir(), 'whitedeck-shot-'));
    const png = join(dir, 'phone.png');
    writeFileSync(png, readFileSync(join(process.cwd(), 'examples', 'scope', 'phone-js-on.png')));
    const slide = deckOf(['', `![](${png})`, '', '| | measured |', '| --- | --- |', '| IS | banner covers the first screen |', '| SHOULD | banner after the first touch |']).slides[0];
    if (slide === undefined) throw new Error('no slide');
    const placed = placeCustomSlide(slide, {});
    const img = placed.find((p) => p.kind === 'image' && p.path === png);
    const table = placed.find((p) => p.kind === 'table');
    if (img?.kind !== 'image' || table?.kind !== 'table') throw new Error('missing');
    expect(img.rect.x + img.rect.w).toBeLessThanOrEqual(table.rect.x);
    expect(table.rect.w).toBeLessThanOrEqual(1812 * 0.35 + 0.01);
    expect(img.rect.h).toBeGreaterThan(600);
  });
});
