import { describe, expect, it } from 'vitest';
import { LOGO_IDS } from '../theme/logos.js';
import { parseDeck } from './deck.js';

const DATA = [
  '# Search Console: clicks per day',
  'Tags: 16 weeks | YoY',
  'Logos: gsc | search | ads "Ads" | examples/scope/gsc.png "My tool"',
  'Context: weeks 1-16 of 2026, `web` search',
  'Conclusion: Clicks fell from 8,600 to 6,300 a day (-27 %)',
  'Notes: first paragraph',
  'Notes: second &amp; last',
  '',
  '![](chart.png)',
  '',
  '| channel | 2025 | change |',
  '| :--- | ---: | :---: |',
  '| **Organic** | 12,614,687 | [-11.6 %](https://example.com) |',
  '| a \\| b | 1 | 2 |',
  '',
  'Source: GA4 export',
].join('\n');

const first = (md: string) => parseDeck(md).slides[0];

describe('data slide fields', () => {
  it('infers the data layout and reads every field', () => {
    const slide = first(`<!-- _class: data -->\n${DATA}`);
    expect(slide).toMatchObject({
      layout: 'data',
      title: 'Search Console: clicks per day',
      tags: ['16 weeks', 'YoY'],
      context: 'weeks 1-16 of 2026, web search',
      conclusion: 'Clicks fell from 8,600 to 6,300 a day (-27 %)',
      notes: 'first paragraph\nsecond & last',
      source: 'Source: GA4 export',
    });
    expect(first(DATA)?.layout).toBe('data');
  });

  it('resolves built-in logos to bundled files, icons with their label, wordmarks without', () => {
    const logos = first(DATA)?.logos ?? [];
    expect(logos.map((l) => l.label)).toEqual([undefined, 'Google Search', 'Ads', 'My tool']);
    expect(logos[0]?.path).toMatch(/assets\/logos\/gsc\.png$/);
    expect(logos[3]?.path).toBe('examples/scope/gsc.png');
  });

  it('parses the table with alignment, inline markdown and escaped pipes', () => {
    expect(first(DATA)?.table).toEqual({
      header: ['channel', '2025', 'change'],
      rows: [
        ['**Organic**', '12,614,687', '[-11.6 %](https://example.com)'],
        ['a | b', '1', '2'],
      ],
      align: ['left', 'right', 'center'],
    });
  });

  it('ships every registry logo as a file', () => {
    expect(LOGO_IDS).toEqual(expect.arrayContaining(['ga4', 'gsc', 'search', 'discover', 'news', 'ai-overviews', 'ads', 'psi']));
  });
});

describe('data slide fails at parse time, never in front of a client', () => {
  it('needs a conclusion line', () => {
    expect(() => first('# Clicks\nTags: 28 days\n![](a.png)')).toThrow(/needs a "Conclusion:" line/);
  });

  it('needs a headline', () => {
    expect(() => first('Conclusion: x')).toThrow(/needs a "# headline"/);
  });

  it('rejects a ## subtitle in favour of Context: / Conclusion:', () => {
    expect(() => first('# A\n## b\nConclusion: c')).toThrow(/no "## subtitle"/);
  });

  it('rejects bullets next to images', () => {
    expect(() => first('# A\nConclusion: c\n- x\n![](a.png)')).toThrow(/bullets OR images\/table/);
  });

  it('rejects the data fields on another layout', () => {
    expect(() => first('<!-- _class: photo -->\nTags: 28 days\n![](a.png)')).toThrow(/belong to the data layout, this slide is "photo"/);
  });

  it('names an unknown logo id and the built-in ones', () => {
    expect(() => first('# A\nConclusion: c\nLogos: gsc | bing')).toThrow(/unknown logo "bing"\. Built in: ga4, gsc/);
  });

  it('rejects an empty tag and a ragged table row', () => {
    expect(() => first('# A\nConclusion: c\nTags: a || b')).toThrow(/Tags: empty item/);
    expect(() => first('# A\nConclusion: c\n| a | b |\n| - | - |\n| 1 |')).toThrow(/has 1 cells, header has 2/);
  });

  it('keeps a deck without the new fields exactly as before (notes allowed anywhere)', () => {
    const slide = first('# Old\n- point\nNotes: say this');
    expect(slide).toMatchObject({ layout: 'title', notes: 'say this' });
    expect(slide?.tags).toBeUndefined();
  });
});
