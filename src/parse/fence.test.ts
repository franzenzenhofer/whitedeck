import { describe, expect, it } from 'vitest';
import { parseDeck } from './deck.js';

/* A fence on a slide used to leak: a `---` inside it split the slide, a `<!-- _class -->`
   inside it switched the layout, a `# comment` inside it replaced the title - and
   validate still reported ok. Keynote White has no code style, so a fence fails loudly
   at parse time, before any line inside it is read as deck syntax. */
const CODE_SLIDE = [
  '# Deck',
  '',
  '---',
  '',
  '# Code slide',
  '',
  '```md',
  '<!-- _class: quote -->',
  '# not a title',
  '---',
  '- not a bullet',
  '```',
].join('\n');

describe('fenced code blocks', () => {
  it('rejects a backtick fence naming its slide and source line, despite --- and directives inside', () => {
    expect(() => parseDeck(CODE_SLIDE)).toThrow(/slide 2, line 7: fenced code block "```md"/);
  });

  it('rejects a tilde fence and a fence indented by up to three spaces', () => {
    expect(() => parseDeck('# A\n\n~~~\ncode\n~~~')).toThrow(/slide 1, line 3: fenced code block "~~~"/);
    expect(() => parseDeck('# A\n   ````ts\ncode\n   ````')).toThrow(/slide 1, line 2/);
  });

  it('counts source lines past the front matter', () => {
    expect(() => parseDeck('---\ntitle: T\n---\n\n# A\n```\nx\n```')).toThrow(/slide 1, line 6/);
  });

  it('tells the author what to do instead', () => {
    expect(() => parseDeck(CODE_SLIDE)).toThrow(/screenshot image|inline `code`/);
  });

  it('leaves inline code and backticks mid-line alone', () => {
    const deck = parseDeck('# A\n\n---\n\n# B\n- run ```npm test``` first\n- `x`');
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[1]?.bullets).toHaveLength(2);
  });

  it('does not treat a line of only two backticks as a fence', () => {
    expect(parseDeck('# A\n``\n- b').slides).toHaveLength(1);
  });
});
