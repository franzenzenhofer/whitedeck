import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { DATA_CHANGE } from '../theme/data.js';
import { colourChanges } from './change-colour.js';
import { placeCustomSlide } from './scope-layout.js';

const { negative: RED, positive: GREEN, same: GREY } = DATA_CHANGE;

describe('table change values are coloured: red down, green up, grey about the same', () => {
  it('colours signed % and pp cells by sign, grey below 1', () => {
    expect(colourChanges(['Organic', '-11.6 %', '+2.4 pp', '-0.30 pp', '+0.9 %'])).toEqual([
      'Organic', `[-11.6 %]{${RED}}`, `[+2.4 pp]{${GREEN}}`, `[-0.30 pp]{${GREY}}`, `[+0.9 %]{${GREY}}`,
    ]);
  });

  it('gives an absolute change the verdict of the % change in its row', () => {
    expect(colourChanges(['All', '-1,469,441', '-11.6 %'])).toEqual(['All', `[-1,469,441]{${RED}}`, `[-11.6 %]{${RED}}`]);
    expect(colourChanges(['Paid', '-120', '-0.3 %'])).toEqual(['Paid', `[-120]{${GREY}}`, `[-0.3 %]{${GREY}}`]);
    expect(colourChanges(['Direct', '+5,000'])).toEqual(['Direct', `[+5,000]{${GREEN}}`]);
  });

  it('leaves unsigned numbers, text and author-coloured cells alone', () => {
    const row = ['12,614,687', '11.6 %', 'fell -3 %', '[-3 %]{#123456}'];
    expect(colourChanges(row)).toEqual(row);
  });

  it('reaches the placed table (and so pptx, Keynote and PDF), header untouched', () => {
    const md = '# GA4: sessions\nConclusion: 1,000 of 2,000 sessions\n| change | x |\n| --- | --- |\n| -11.6 % | a |';
    const slide = parseDeck(md).slides[0];
    if (slide === undefined) throw new Error('no slide');
    const table = placeCustomSlide(slide, {}).find((p) => p.kind === 'table');
    if (table?.kind !== 'table') throw new Error('no table');
    expect(table.header).toEqual(['change', 'x']);
    expect(table.rows).toEqual([[`[-11.6 %]{${RED}}`, 'a']]);
  });
});
