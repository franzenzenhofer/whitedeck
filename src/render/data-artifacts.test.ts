import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseDeck, type Deck } from '../parse/deck.js';
import { inlineVisibleText } from '../parse/inline.js';
import { ptToEmu, ptToPx } from '../theme/scope.js';
import { toMarpMarkdown } from './marp-md.js';
import { renderPptx } from './pptx.js';
import { placeCustomSlide } from './scope-layout.js';

/* P1/P3: the final artifacts of the shipped example deck, read back. Every header text
   of a data slide (headline, tags, logo labels, context, conclusion, source) and every
   table cell must be a TEXT object in the pptx - never pixels - at the placement's
   geometry, the same geometry the HTML/PDF paints. Only charts and logos are pictures. */
const EXAMPLES = resolve(dirname(fileURLToPath(import.meta.url)), '../../examples');
const DECK_PATH = join(EXAMPLES, 'data-demo.md');

let deck: Deck;
let zip: JSZip;
let previousCwd: string;

beforeAll(async () => {
  previousCwd = process.cwd();
  process.chdir(EXAMPLES);
  deck = parseDeck(readFileSync(DECK_PATH, 'utf8'));
  const out = join(mkdtempSync(join(tmpdir(), 'whitedeck-data-')), 'data.pptx');
  await renderPptx(deck, out);
  zip = await JSZip.loadAsync(readFileSync(out));
});

afterAll(() => process.chdir(previousCwd));

const slideXml = async (n: number): Promise<string> => {
  const xml = await zip.file(`ppt/slides/slide${n}.xml`)?.async('string');
  if (xml === undefined) throw new Error(`slide${n}.xml missing`);
  return xml;
};

/** The text of every <p:sp> text body, with its geometry and preset shape. */
const textShapes = (xml: string): { text: string; geom: string; x: number; y: number }[] =>
  [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].flatMap((m) => {
    const shape = m[0];
    const text = [...shape.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => t[1]).join('');
    const off = /<a:off x="(-?\d+)" y="(-?\d+)"\/>/.exec(shape);
    const geom = /prst="(\w+)"/.exec(shape)?.[1] ?? '';
    return text === '' ? [] : [{ text: decode(text), geom, x: Number(off?.[1]), y: Number(off?.[2]) }];
  });

const decode = (s: string): string =>
  s.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');

const dataSlides = (): { slide: Deck['slides'][number]; n: number }[] =>
  deck.slides.flatMap((slide, i) => (slide.layout === 'data' ? [{ slide, n: i + 1 }] : []));

describe('data layout pptx: every header text is a native text object', () => {
  it('has the headline, context, conclusion and source as text boxes at the placed position', async () => {
    for (const { slide, n } of dataSlides()) {
      const shapes = textShapes(await slideXml(n));
      const placed = placeCustomSlide(slide, deck.meta).filter((p) => p.kind === 'text');
      for (const p of placed) {
        const shape = shapes.find((s) => s.text === inlineVisibleText(p.text));
        expect(shape, `slide ${n}: "${p.text}" is not a text object`).toBeDefined();
        expect(shape?.x).toBe(ptToEmu(p.box.x));
        expect(shape?.y).toBe(ptToEmu(p.box.y));
      }
      const wanted = [slide.title, slide.context, slide.conclusion, slide.source].filter((t) => t !== undefined);
      for (const t of wanted) expect(shapes.map((s) => s.text)).toContain(inlineVisibleText(t));
    }
  });

  it('paints every tag as text inside ONE rounded-rectangle shape', async () => {
    for (const { slide, n } of dataSlides()) {
      const pills = textShapes(await slideXml(n)).filter((s) => s.geom === 'roundRect');
      expect(pills.map((p) => p.text)).toEqual([...(slide.tags ?? [])]);
    }
  });

  it('labels icon logos with text, and every logo is a picture', async () => {
    const xml = await slideXml(2);
    expect(textShapes(xml).map((s) => s.text)).toContain('Google Search');
    const slide = deck.slides[1];
    const pictures = (xml.match(/<p:pic>/g) ?? []).length;
    expect(pictures).toBe((slide?.logos?.length ?? 0) + (slide?.images.length ?? 0));
  });

  it('paints the table as a native table whose cells equal the markdown', async () => {
    const xml = await slideXml(3);
    expect(xml).toContain('<a:tbl>');
    const table = deck.slides[2]?.table;
    const rows = [...xml.matchAll(/<a:tr [\s\S]*?<\/a:tr>/g)].map((r) =>
      [...r[0].matchAll(/<a:tc>[\s\S]*?<\/a:tc>/g)].map((c) => decode([...c[0].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => t[1]).join(''))),
    );
    expect(rows).toEqual([table?.header, ...(table?.rows ?? [])].map((row) => row?.map((cell) => inlineVisibleText(cell))));
  });

  it('carries Notes: into the presenter notes', async () => {
    const notes = await zip.file('ppt/notesSlides/notesSlide2.xml')?.async('string');
    expect(notes).toContain('Say first what the chart shows, then the drop.');
  });

  it('keeps every tag, logo and the headline on the header row, inside the slide', () => {
    for (const { slide } of dataSlides()) {
      const placed = placeCustomSlide(slide, deck.meta);
      for (const p of placed) {
        const r = p.kind === 'pill' || p.kind === 'text' || p.kind === 'bullets' ? p.box : p.kind === 'notes' ? p.box : p.rect;
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(1920 + 0.01);
        expect(r.y + r.h).toBeLessThanOrEqual(1080);
      }
    }
  });
});

describe('data layout HTML: the same geometry as the pptx', () => {
  it('paints pills and the table at the placed pixel positions', () => {
    const md = toMarpMarkdown(deck);
    const slide = deck.slides[2];
    if (slide === undefined) throw new Error('slide 3 missing');
    for (const p of placeCustomSlide(slide, deck.meta)) {
      if (p.kind === 'pill') expect(md).toContain(`left:${ptToPx(p.box.x)}px;top:${ptToPx(p.box.y)}px;`);
      if (p.kind === 'table') expect(md).toContain(`left:${ptToPx(p.rect.x)}px;top:${ptToPx(p.rect.y)}px;`);
    }
    expect(md).toContain('class="wd-text wd-pill"');
    expect(md).toContain('<table class="wd-text wd-table"');
    expect(md).toContain('<!-- Say first what the chart shows, then the drop. -->');
  });
});
