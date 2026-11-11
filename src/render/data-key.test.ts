import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { inlineVisibleText } from '../parse/inline.js';
import { findKeynoteApp } from './key-app.js';
import { openDocumentLines, renderKey, runAppleScript } from './key.js';

/*
 * The editability proof (Franz, 11 Nov 2026: "the headlines and the stuff below should
 * always be editable for me, should be real keynote stuff"). A 5-slide data deck is built
 * to .key by the real Keynote, reopened, and every object is read back through Keynote's
 * own dictionary: headline, context, conclusion, source and logo labels must be TEXT ITEMS,
 * tags a rounded shape grouped with its text item, table cells TABLE cells - never part of an image. Needs Keynote on
 * an unlocked console: runs on the build Mac, skipped where WHITEDECK_KEYNOTE=off.
 */
const onMacWithKeynote = (await findKeynoteApp(process.platform)) !== undefined;
const EXAMPLES = resolve(dirname(fileURLToPath(import.meta.url)), '../../examples');

const DECK_MD = [
  '<!-- _class: title -->',
  '# Editable data slides',
  '## five slides, read back from Keynote',
  '---',
  '# Search Console: example.com clicks per day',
  'Tags: 16 weeks',
  'Logos: gsc | search',
  'Context: weeks 1-16 of 2026, all queries',
  'Conclusion: Clicks fell from 8,600 to 6,300 a day (-27 %)',
  '![](data/clicks.png)',
  'Source: [Search Console export](https://search.google.com/search-console)',
  '---',
  '# Google Analytics: sessions by channel',
  'Tags: 28 days | YoY',
  'Logos: ga4',
  'Context: 13 Oct - 9 Nov 2026 vs 14 Oct - 10 Nov 2025',
  'Conclusion: Organic 12,614,687 -> 11,145,246 sessions (-11.6 %)',
  '![](data/pies.png)',
  '| channel | 2025 | 2026 |',
  '| --- | ---: | ---: |',
  '| Organic search | 12,614,687 | 11,145,246 |',
  'Source: GA4 export',
  '---',
  '# Google Ads and organic: clicks on the same searches',
  'Tags: 28 days',
  'Logos: ads | discover | news',
  'Conclusion: 1,234 of 5,678 clicks (21.7 %) went to the ad',
  '| search | ad clicks | organic clicks |',
  '| --- | ---: | ---: |',
  '| wohnung mieten berlin | 1,234 | 4,444 |',
  'Source: Google Ads export',
  '---',
  '# Two ways to split branded queries',
  'Tags: method',
  'Logos: gsc',
  'Conclusion: Both splits agree on 4.1M of 5.3M clicks',
  '- (A) our regex on named queries',
  '- (B) Search Console filter',
  'Notes: speaker note for slide five',
  'Source: method note',
].join('\n');

const RECORD = '\u001e';
const FIELD = '\u001f';

/** Every object of every slide as "slide FIELD kind FIELD text", kinds: text, shape, cell, image. */
const objectsScript = (keyPath: string): string =>
  [
    'with timeout of 600 seconds',
    '  tell application id "com.apple.Keynote"',
    ...openDocumentLines(keyPath),
    '    set out to {}',
    '    set n to 0',
    '    repeat with s in slides of d',
    '      set n to n + 1',
    '      repeat with ti in text items of s',
    '        set end of out to (n as text) & (ASCII character 31) & "text" & (ASCII character 31) & (object text of ti)',
    '      end repeat',
    '      repeat with g in groups of s',
    '        repeat with gi in text items of g',
    '          set end of out to (n as text) & (ASCII character 31) & "grouptext" & (ASCII character 31) & (object text of gi)',
    '        end repeat',
    '        repeat with gs in shapes of g',
    '          set end of out to (n as text) & (ASCII character 31) & "groupshape" & (ASCII character 31) & ""',
    '        end repeat',
    '      end repeat',
    '      repeat with sh in shapes of s',
    '        set end of out to (n as text) & (ASCII character 31) & "shape" & (ASCII character 31) & (object text of sh)',
    '      end repeat',
    '      repeat with tb in tables of s',
    '        repeat with c in cells of tb',
    '          set end of out to (n as text) & (ASCII character 31) & "cell" & (ASCII character 31) & (formatted value of c)',
    '        end repeat',
    '      end repeat',
    '      repeat with im in images of s',
    '        set end of out to (n as text) & (ASCII character 31) & "image" & (ASCII character 31) & ""',
    '      end repeat',
    '    end repeat',
    '    close d saving no',
    '  end tell',
    'end timeout',
    "set AppleScript's text item delimiters to (ASCII character 30)",
    'return out as text',
  ].join('\n');

interface KeyObject {
  readonly slide: number;
  readonly kind: string;
  readonly text: string;
}

describe.skipIf(!onMacWithKeynote)('data slides in Keynote: every text is a native, editable object', () => {
  const deck = parseDeck(DECK_MD);
  let objects: KeyObject[] = [];
  let previousCwd = '';

  beforeAll(async () => {
    previousCwd = process.cwd();
    process.chdir(EXAMPLES);
    /* Regression (2026-11-11): the deck is built INTO a hidden .claude/worktrees path, where
       Keynote refuses a scripted import - whitedeck must keep Keynote in its temp folder. */
    const base = mkdtempSync(join(tmpdir(), 'whitedeck-data-key-'));
    const hidden = join(base, '.claude', 'worktrees', 'x');
    mkdirSync(hidden, { recursive: true });
    await renderKey(deck, join(hidden, 'data.key'));
    expect(existsSync(join(hidden, 'data.key'))).toBe(true);
    const keyPath = join(hidden, 'data.key');
    const dump = await runAppleScript(objectsScript(keyPath));
    objects = dump.split(RECORD).map((record) => {
      const [slide, kind, text] = record.split(FIELD);
      return { slide: Number(slide), kind: kind ?? '', text: (text ?? '').trim() };
    });
  }, 900_000);

  afterAll(() => process.chdir(previousCwd));

  const of = (slide: number, kind: string): string[] => objects.filter((o) => o.slide === slide && o.kind === kind).map((o) => o.text);

  it('reads headline, context, conclusion, source and logo labels as text items', () => {
    deck.slides.forEach((slide, index) => {
      if (slide.layout !== 'data') return;
      const texts = of(index + 1, 'text');
      const wanted = [slide.title, slide.context, slide.conclusion, slide.source, ...(slide.logos ?? []).map((l) => l.label)];
      for (const t of wanted) if (t !== undefined) expect(texts, `slide ${index + 1}`).toContain(inlineVisibleText(t));
    });
  });

  /* Keynote imports a pptx rounded rectangle with text as a GROUP of a rounded shape and
     a text item (read back 11 Nov 2026) - both editable, the text by a double-click. */
  it('reads every tag as a group of a rounded shape and an editable text item', () => {
    deck.slides.forEach((slide, index) => {
      if (slide.layout !== 'data') return;
      const tags = [...(slide.tags ?? [])];
      expect(of(index + 1, 'grouptext')).toEqual(tags);
      expect(of(index + 1, 'groupshape')).toHaveLength(tags.length);
    });
  });

  it('reads every table cell as a native table cell', () => {
    deck.slides.forEach((slide, index) => {
      const table = slide.table;
      if (table === undefined) return;
      expect(of(index + 1, 'cell')).toEqual([table.header, ...table.rows].flat().map((c) => inlineVisibleText(c)));
    });
  });

  it('keeps only charts and logos as images', () => {
    deck.slides.forEach((slide, index) => {
      if (slide.layout !== 'data') return;
      expect(of(index + 1, 'image')).toHaveLength(slide.images.length + (slide.logos?.length ?? 0));
    });
  });
});
