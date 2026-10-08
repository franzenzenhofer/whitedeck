import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { renderHtml } from './html.js';
import { renderPptx } from './pptx.js';

/* P1/P2: deck syntax written as an example in inline code reaches the slide as the text the
   author typed - checked in the built HTML (through the real Marp) and the pptx XML. */
const DECK = [
  '# Syntax examples',
  '',
  '---',
  '',
  '# Literal',
  '- markdown image: `![alt](x.png)`',
  '- layout: `<!-- _class: quote -->`',
  '<!-- speaker note -->',
  '',
  '---',
  '',
  '<!-- _class: quote -->',
  '> "Use `<h1>` once."',
  '> -- Someone',
].join('\n');

describe('literal deck syntax in the final artifacts', () => {
  it('paints the example text in HTML, adds no image, keeps the layout and hides the comment', async () => {
    const out = join(mkdtempSync(join(tmpdir(), 'whitedeck-literal-')), 'literal.html');
    await renderHtml(parseDeck(DECK), out);
    const html = readFileSync(out, 'utf8');
    expect(html).toContain('markdown image: ![alt](x.png)');
    expect(html).not.toMatch(/<img[^>]*x\.png/);
    expect(html).toContain('layout: &lt;!-- _class: quote --&gt;');
    expect(html.match(/<section[^>]*class="quote"/g)).toHaveLength(1);
    expect(html).not.toContain('speaker note');
    expect(html).toContain('Use &lt;h1&gt; once.');
  });

  it('writes the example text as one plain run in the pptx, with no picture and no link', async () => {
    const out = join(mkdtempSync(join(tmpdir(), 'whitedeck-literal-')), 'literal.pptx');
    await renderPptx(parseDeck(DECK), out);
    const zip = await JSZip.loadAsync(readFileSync(out));
    const xml = (await zip.file('ppt/slides/slide2.xml')?.async('string')) ?? '';
    expect(xml).toContain('markdown image: ![alt](x.png)');
    expect(xml).toContain('layout: &lt;!-- _class: quote --&gt;');
    expect(xml).not.toContain('hlinkClick');
    expect(xml).not.toContain('speaker note');
    expect(Object.values(zip.files).filter((f) => f.name.startsWith('ppt/media/') && !f.dir)).toEqual([]);
  });
});
