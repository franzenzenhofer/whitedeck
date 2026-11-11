import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { parseInline, styledRuns } from '../parse/inline.js';
import { COMPARE, compareLabelBar, compareNotes, LOGO, SCOPE_TITLE, SHOT_FRAME, SHOT_NOTES, SHOT_SIDE, type PtRect } from '../theme/scope.js';
const SCOPE_TITLE_PT = SCOPE_TITLE.sizePt;
import { placeCustomSlide } from './scope-layout.js';
import { solidPngBytes, solidPngDims } from './solid-png.js';
import { jpegSize, pngSize } from './geometry.js';

const SCOPE_MD = [
  '---',
  'logo: examples/scope/deck-logo.png',
  '---',
  '',
  '<!-- _class: scope-compare -->',
  '',
  'Scope: Detail Page ([https://x.example/a](https://x.example/a))',
  '',
  'Tool: examples/scope/tool-logo.png',
  '',
  '# "JS turned off" Test',
  '',
  '![label="JS on" border=red](examples/scope/phone-js-on.png)',
  '![label="JS on"](examples/scope/phone-js-on-after.png)',
  '![label="JS off"](examples/scope/phone-js-off.png)',
  '',
  '- **IS (not ok)**',
  '- cookie banner initially displayed',
  '- **SHOULD**',
  '- display cookie banner after minimal user interaction',
].join('\n');

describe('parser: image attributes, fields and inline runs', () => {
  it('reads border and label from the alt text and the Scope/Tool lines', () => {
    const deck = parseDeck(SCOPE_MD);
    const slide = deck.slides[0];
    expect(deck.meta.logo).toBe('examples/scope/deck-logo.png');
    expect(slide?.images).toEqual([
      { path: 'examples/scope/phone-js-on.png', border: '#ee220c', label: 'JS on' },
      { path: 'examples/scope/phone-js-on-after.png', label: 'JS on' },
      { path: 'examples/scope/phone-js-off.png', label: 'JS off' },
    ]);
    expect(slide?.scope).toBe('Detail Page ([https://x.example/a](https://x.example/a))');
    expect(slide?.tool).toBe('examples/scope/tool-logo.png');
    expect(slide?.columns?.map((c) => c.header)).toEqual(['IS (not ok)', 'SHOULD']);
  });

  it('fails loudly on an unknown attribute, a missing scope or the wrong image count', () => {
    expect(() => parseDeck('<!-- _class: scope-shot -->\n\nScope: x\n\n![frame=red](a.png)')).toThrow(/Unknown image attribute "frame"/);
    expect(() => parseDeck('<!-- _class: scope-shot -->\n\n![](a.png)')).toThrow(/needs a "Scope:" line/);
    expect(() => parseDeck('<!-- _class: scope-shot-notes -->\n\nScope: x\n\n![](a.png)')).toThrow(/exactly two images/);
    expect(() => parseDeck('<!-- _class: scope-compare -->\n\nScope: x\n\n![](a.png)')).toThrow(/label=/);
    expect(() => parseDeck('![border=pink](a.png)')).toThrow(/Unknown border colour/);
  });

  it('parses bold, links and coloured runs with character offsets', () => {
    expect(parseInline('a **b [c](https://u)** [d]{#1DB100} e')).toEqual([
      { text: 'a ' },
      { text: 'b ', bold: true },
      { text: 'c', url: 'https://u', bold: true },
      { text: ' ' },
      { text: 'd', color: '#1db100' },
      { text: ' e' },
    ]);
    expect(styledRuns('ab **cd** ef [g]{#1db100}')).toEqual([
      { start: 4, end: 5, bold: true },
      { start: 10, end: 10, bold: false, color: '#1db100' },
    ]);
  });
});

describe('placeCustomSlide geometry (points, measured on the reference deck)', () => {
  it('spans one label bar over consecutive equal labels and puts notes right of the columns', () => {
    const deck = parseDeck(SCOPE_MD);
    const placed = placeCustomSlide(deck.slides[0]!, deck.meta);
    const bars = placed.filter((p) => p.kind === 'rect' && p.fill === '#00a1ff');
    expect(bars.map((b) => (b.kind === 'rect' ? b.rect : undefined))).toEqual([compareLabelBar(0, 1), compareLabelBar(2, 2)]);
    const images = placed.filter((p) => p.kind === 'image');
    // 3 screenshots + tool logo + deck logo
    expect(images).toHaveLength(5);
    const first = images.find((p) => p.kind === 'image' && p.path.endsWith('phone-js-on.png'));
    expect(first?.kind === 'image' && first.border).toBe('#ee220c');
    expect(first?.kind === 'image' && Math.round(first.rect.y)).toBe(Math.round(COMPARE.imageY));
    const notes = placed.find((p) => p.kind === 'notes');
    expect(notes?.kind === 'notes' && notes.box).toEqual(compareNotes(3));
    const logo = images.at(-1);
    expect(logo?.kind === 'image' && logo.rect.x >= LOGO.x && logo.rect.x + logo.rect.w <= LOGO.x + LOGO.w + 0.01).toBe(true);
  });

  it('centres a scope-shot image inside the band and shrinks a long left headline', () => {
    const md = [
      '<!-- _class: scope-shot -->',
      '',
      'Scope: x',
      '',
      '# Google Page Speed Insights',
      '',
      '![border=red](examples/scope/psi.png)',
      '',
      '---',
      '',
      '<!-- _class: title-bullets-left -->',
      '',
      '# 3 SEO Tests to do 80% of technical onpage/onsite SEO right!',
      '',
      '- one',
    ].join('\n');
    const deck = parseDeck(md);
    const shot = placeCustomSlide(deck.slides[0]!, deck.meta).find((p) => p.kind === 'image');
    if (shot?.kind !== 'image') throw new Error('no image');
    expect(shot.rect.x + shot.rect.w / 2).toBeCloseTo(SHOT_FRAME.x + SHOT_FRAME.w / 2, 1);
    expect(shot.rect.h).toBeLessThanOrEqual(SHOT_FRAME.h);
    const title = placeCustomSlide(deck.slides[1]!, deck.meta).find((p) => p.kind === 'text');
    if (title?.kind !== 'text') throw new Error('no title');
    expect(title.box.sizePt).toBeLessThan(112);
    expect(title.box.sizePt).toBeGreaterThanOrEqual(60);
  });

  const shotNotesMd = (lines: readonly string[]): string =>
    [
      '<!-- _class: scope-shot-notes -->',
      '',
      'Scope: x',
      '',
      '# GSC Inspect URL',
      '',
      '![border=red](examples/scope/gsc.png)',
      '![border=green](examples/scope/gsc-resources.png)',
      '',
      '- **IS (not ok)**',
      ...lines.map((l) => `- ${l}`),
      '- **SHOULD**',
      '- fix it',
    ].join('\n');
  const LONG_LINE = 'partner badge (Partner) not rendered: image on legacy.example.com blocked by robots.txt';

  it('shrinks a long notes block to fit, and refuses one that does not fit even at 20pt', () => {
    const fits = parseDeck(shotNotesMd([LONG_LINE]));
    const notes = placeCustomSlide(fits.slides[0]!, fits.meta).find((p) => p.kind === 'notes');
    if (notes?.kind !== 'notes') throw new Error('no notes');
    expect(notes.sizePt).toBeLessThan(34.4);
    expect(notes.sizePt).toBeGreaterThanOrEqual(20);
    /* the paragraph gap shrinks with the text: 30pt at 34.4pt */
    expect(notes.gapPt).toBeCloseTo((30 * notes.sizePt) / 34.4, 5);
    const short = parseDeck(shotNotesMd(['ok']));
    const full = placeCustomSlide(short.slides[0]!, short.meta).find((p) => p.kind === 'notes');
    expect(full?.kind === 'notes' && full.sizePt).toBe(34.4);
    expect(full?.kind === 'notes' && full.gapPt).toBe(30);

    const overflows = parseDeck(shotNotesMd([LONG_LINE, LONG_LINE, LONG_LINE, LONG_LINE]));
    expect(() => placeCustomSlide(overflows.slides[0]!, overflows.meta)).toThrow(/slide "GSC Inspect URL": notes block does not fit .* even at 20pt/);
  });
});

describe('scope-shot-side: a large side shot with the notes under it', () => {
  const sideMd = (title: string, notes: readonly string[] = ['0 of 20 listing cards']): string =>
    [
      '<!-- _class: scope-shot-side -->',
      '',
      'Scope: x',
      '',
      `# ${title}`,
      '',
      '![border=red](examples/scope/gsc.png)',
      '![border=red](examples/scope/gsc-resources.png)',
      '',
      '- **IS (not ok)**',
      ...notes.map((l) => `- ${l}`),
      '- **SHOULD**',
      '- all cards',
      '',
      'Caption: [https://u.example/r](https://u.example/r)',
    ].join('\n');

  it('gives the side shot about a third of the slide, beside the main shot, notes below it, nothing on the caption', () => {
    const deck = parseDeck(sideMd('GSC Inspect URL'));
    const placed = placeCustomSlide(deck.slides[0]!, deck.meta);
    const imgs = placed.filter((p) => p.kind === 'image' && p.border !== undefined);
    expect(imgs).toHaveLength(2);
    const [main, side] = imgs.map((p) => (p.kind === 'image' ? p.rect : undefined)) as [PtRect, PtRect];
    expect(SHOT_SIDE.side.w / 1920).toBeGreaterThanOrEqual(0.3);
    expect(SHOT_SIDE.side.w / 1920).toBeLessThanOrEqual(0.35);
    expect(SHOT_SIDE.side.w).toBeGreaterThan(SHOT_NOTES.side.w * 1.5);
    expect(main.x + main.w).toBeLessThan(side.x);
    expect(side.x + side.w).toBeLessThanOrEqual(1920 - 54 + 0.01);
    const notes = placed.find((p) => p.kind === 'notes');
    if (notes?.kind !== 'notes') throw new Error('no notes');
    expect(notes.box.y).toBeGreaterThanOrEqual(SHOT_SIDE.side.y + SHOT_SIDE.side.h);
    expect(notes.box.y + notes.box.h).toBeLessThanOrEqual(1018);
    expect(main.y + main.h).toBeLessThanOrEqual(1018);
  });

  it('keeps a 75-character headline on one line, takes exactly two images and refuses notes that cannot fit', () => {
    const title = 'München wohnung-kaufen - Rich Results Test - 31 Oct 2026 15:44 UTC - 1 of 2';
    const deck = parseDeck(sideMd(title));
    const head = placeCustomSlide(deck.slides[0]!, deck.meta).find((p) => p.kind === 'text' && p.text === title);
    if (head?.kind !== 'text') throw new Error('no title');
    /* one line: the estimated width at the fitted size is inside the box, and the size is a readable headline */
    expect(title.length * head.box.sizePt * 0.48).toBeLessThanOrEqual(head.box.w);
    expect(head.box.sizePt).toBeGreaterThanOrEqual(44);
    expect(() => parseDeck('<!-- _class: scope-shot-side -->\n\nScope: x\n\n![](a.png)')).toThrow(/scope-shot-side takes exactly two images/);
    const long = 'partner badge (Intrepid) not rendered: image on legacy.asi-reisen.de blocked by robots.txt';
    const over = parseDeck(sideMd('t', [long, long, long, long, long]));
    expect(() => placeCustomSlide(over.slides[0]!, over.meta)).toThrow(/notes block does not fit/);
  });
});

describe('scope-title: one-line', () => {
  const md = (title: string, fm = 'scope-title: one-line'): string =>
    ['---', fm, '---', '', '<!-- _class: scope-shot -->', '', 'Scope: x', '', `# ${title}`, '', '![](examples/scope/gsc.png)'].join('\n');
  const titleOf = (src: string, title: string) => {
    const deck = parseDeck(src);
    const t = placeCustomSlide(deck.slides[0]!, deck.meta).find((p) => p.kind === 'text' && p.text === title);
    if (t?.kind !== 'text') throw new Error('no title');
    return t.box;
  };

  it('sizes a 95-character headline to one line instead of wrapping it at 46pt', () => {
    const title = 'Berlin neubauwohnung-mieten ?enteredFrom=cb - Rich Results Test - 31 Oct 2026 15:44 UTC - 1 of 2';
    const one = titleOf(md(title), title);
    expect(title.length * one.sizePt * 0.48).toBeLessThanOrEqual(one.w);
    expect(one.sizePt).toBeGreaterThanOrEqual(30);
    expect(one.sizePt).toBeGreaterThan(one.w / (title.length * 0.54) - 0.11);
    expect(title.length * one.sizePt * 0.54).toBeLessThanOrEqual(one.w);
    /* without the option the same headline is fitted to two lines (the default behaviour stays) */
    const two = titleOf(md(title, 'title: t'), title);
    expect(title.length * two.sizePt * 0.48).toBeGreaterThan(two.w);
  });

  it('keeps a short headline at the layout size and refuses one that needs less than 30pt', () => {
    expect(titleOf(md('GSC Inspect URL'), 'GSC Inspect URL').sizePt).toBe(SCOPE_TITLE_PT);
    const long = 'x'.repeat(140);
    const deck = parseDeck(md(long));
    expect(() => placeCustomSlide(deck.slides[0]!, deck.meta)).toThrow(/one line \(min 30pt\)/);
    expect(() => parseDeck(md('t', 'scope-title: two'))).toThrow(/Unknown scope-title/);
  });
});

describe('image sizes and solid PNGs', () => {
  it('reads PNG and JPEG dimensions and builds aspect-true solid PNGs', () => {
    expect(pngSize('examples/scope/psi.png')).toEqual({ w: 764, h: 761 });
    expect(jpegSize('examples/scope/psi.png')).toBeUndefined();
    expect(jpegSize('examples/scope/psi.jpg')).toEqual({ w: 764, h: 761 });
    const dims = solidPngDims(370, 54);
    expect(dims).toEqual({ w: 64, h: 9 });
    const bytes = solidPngBytes('#00a1ff', dims);
    expect(bytes.readUInt32BE(16)).toBe(64);
    expect(bytes.readUInt32BE(20)).toBe(9);
  });
});
