import { describe, expect, it } from 'vitest';
import { lintDeck } from './lint.js';
import { parseDeck } from './parse/deck.js';

const lint = (headline: string, conclusion: string) => lintDeck(parseDeck(`# ${headline}\nConclusion: ${conclusion}`));

describe('validate: the headline / conclusion rules on data slides', () => {
  it('passes a descriptive headline and a conclusion with absolutes', () => {
    expect(lint('Search Console: /Suche/de/ clicks', 'Clicks fell from 8,600 to 6,300 a day (-27 %)')).toEqual({ errors: [], warnings: [] });
    expect(lint('GA4: sessions', '40 % of sessions (1.2M of 3.0M) came from Google organic').errors).toEqual([]);
  });

  it('warns on a finding verb or a % in the headline', () => {
    const { warnings } = lint('Clicks fell 27 % after the release', 'Clicks 8,600 -> 6,300 a day (-27 %)');
    expect(warnings).toEqual([
      expect.stringMatching(/^slide 1: headline has the finding verb "fell"/),
      expect.stringMatching(/^slide 1: headline has a %/),
    ]);
  });

  it('errors on a % without absolutes', () => {
    expect(lint('GA4: sessions', 'Organic share fell by 2 %').errors).toEqual([
      expect.stringMatching(/^slide 1: conclusion has a % without its absolute numbers/),
    ]);
  });

  it('errors on a compact range instead of one written out with units', () => {
    const { errors } = lint('GA4: sessions', 'Share moved within 13-16 % (1,200 of 8,000 sessions)');
    expect(errors).toEqual([expect.stringMatching(/write the range "13-16 %" out with units/)]);
  });

  it('leaves non-data slides to the old checks', () => {
    expect(lintDeck(parseDeck('# Traffic fell 27 %\n- point'))).toEqual({ errors: [], warnings: [] });
  });
});
