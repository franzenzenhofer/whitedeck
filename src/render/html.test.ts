import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { renderHtml } from './html.js';

const DEMO_MD = [
  '---',
  'title: HTML Render Demo',
  '---',
  '',
  '<!-- _class: title -->',
  '# Hello Keynote',
  '## A subtitle',
  '',
  '---',
  '',
  '<!-- _class: title-bullets -->',
  '# Agenda',
  '- First',
  '- Second',
  '',
  '---',
  '',
  '<!-- _class: quote -->',
  '> "Simplicity is the ultimate sophistication."',
  '> -- Leonardo da Vinci',
  '',
  '---',
  '',
  '# Links work',
  '- see [the docs](https://example.com/docs)',
  '',
  'Source: [GSC](https://search.google.com/search-console)',
].join('\n');

describe('renderHtml (real marp-cli)', () => {
  it('renders a deck to a self-contained HTML file with layout classes and theme geometry', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-html-'));
    const outPath = join(outDir, 'demo.html');

    await renderHtml(parseDeck(DEMO_MD), outPath);

    const html = readFileSync(outPath, 'utf8');
    expect(html).toContain('class="title"');
    expect(html).toContain('class="title-bullets"');
    expect(html).toContain('class="quote"');
    expect(html).toContain('Hello Keynote');
    expect(html).toContain('Leonardo da Vinci');
    expect(html).toMatch(/width:\s*2560px/);
    expect(html).toMatch(/font-size:\s*112pt/);
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toMatch(/<footer>.*search-console.*<\/footer>/);
  });
});

describe('renderHtml images (real marp-cli, P1: the DOM, not the markdown)', () => {
  it('paints a markdown image from a folder with spaces as an <img>, never as literal text', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'whitedeck html (images) '));
    copyFileSync(fileURLToPath(new URL('../../examples/ocean.png', import.meta.url)), join(dir, 'ocean.png'));
    const md = '<!-- _class: photo-horizontal -->\n\n# A photo slide\n\n![](ocean.png)\n';
    const outPath = join(dir, 'images.html');
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await renderHtml(parseDeck(md), outPath);
    } finally {
      process.chdir(cwd);
    }
    const html = readFileSync(outPath, 'utf8');
    expect(html).not.toContain('![](');
    expect(html.match(/<img [^>]*src="[^"]*%20%28images%29%20[^"]*\/ocean\.png"/g)).toHaveLength(1);
  });
});
