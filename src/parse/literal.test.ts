import { describe, expect, it } from 'vitest';
import { parseDeck } from './deck.js';

/* Same bug class as the fenced code block: deck syntax written as an example - in inline
   code or inside an HTML comment - must stay text (or stay hidden), never act on the deck.
   Markdown whitedeck cannot paint (### headings, tables) fails loudly instead (P8). */
const second = (body: string) => parseDeck(`# A\n\n---\n\n# B\n${body}`).slides[1];

describe('deck syntax inside inline code stays text', () => {
  it('keeps a layout directive in a code span as bullet text, without switching the layout', () => {
    const slide = second('- write `<!-- _class: quote -->` to pick a layout');
    expect(slide?.layout).toBe('title-bullets');
    expect(slide?.bullets.map((b) => b.text)).toEqual(['write <!-- _class: quote --> to pick a layout']);
  });

  it('keeps a background directive in a code span as bullet text', () => {
    const slide = second('- `<!-- _background: #ff0000 -->` tints one slide');
    expect(slide?.background).toBeUndefined();
    expect(slide?.bullets).toHaveLength(1);
  });

  it('keeps image syntax in a code span as bullet text, never as an image', () => {
    const slide = second('- markdown image: `![alt](x.png)`');
    expect(slide?.images).toEqual([]);
    expect(slide?.bullets.map((b) => b.text)).toEqual(['markdown image: ![alt](x.png)']);
  });
});

describe('HTML comments are invisible', () => {
  it('drops a one-line comment instead of painting it as a bullet', () => {
    expect(second('- point\n<!-- speaker note -->')?.bullets.map((b) => b.text)).toEqual(['point']);
  });

  it('hides a multi-line comment, including any ---, fence or heading inside it', () => {
    const deck = parseDeck('# A\n\n---\n\n# B\n- point\n<!--\n---\n```\n# not a title\n-->\n- after');
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[1]).toMatchObject({ layout: 'title-bullets', title: 'B' });
    expect(deck.slides[1]?.bullets.map((b) => b.text)).toEqual(['point', 'after']);
  });

  it('ends a comment at the first line holding -->, as CommonMark does', () => {
    const slide = second('<!--\n<!-- _class: quote -->\n- after');
    expect(slide?.layout).toBe('title-bullets');
    expect(slide?.bullets.map((b) => b.text)).toEqual(['after']);
  });

  it('fails on a comment that is never closed instead of hiding the rest of the deck', () => {
    expect(() => parseDeck('# A\n\n---\n\n# B\n<!-- draft\n- a')).toThrow(/slide 2, line 6: HTML comment .* never closed/);
  });

  it('still reads a directive line with surrounding whitespace', () => {
    expect(parseDeck('  <!-- _class: quote -->  \n> "Q"').slides[0]?.layout).toBe('quote');
  });
});

describe('markdown whitedeck cannot paint fails loudly', () => {
  it('rejects a ### heading naming its slide and line', () => {
    expect(() => second('### small heading\n- x')).toThrow(/slide 2, line 6: heading "### small heading" is not supported/);
  });

  it('rejects a table naming its slide and header line', () => {
    expect(() => second('| a | b |\n|---|:-:|\n| 1 | 2 |')).toThrow(/slide 2, line 6: table "\| a \| b \|" is not supported/);
  });

  it('leaves a pipe in ordinary bullet text alone', () => {
    expect(second('- A | B\n- C')?.bullets).toHaveLength(2);
  });
});
