import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { machineFacts } from './env/facts.js';
import { parseDeck } from './parse/deck.js';

/*
 * The participant journey on this OS: the built CLI renders every shipped example with
 * `-f all`. pptx, html and pdf must exist everywhere (CI runners all carry a browser);
 * key exists exactly when this is a Mac with Keynote, and is a one-line skip otherwise.
 */
const execFileAsync = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(ROOT, 'dist', 'cli.js');
const EXAMPLES = ['demo.md', 'scope-demo.md'];
const facts = await machineFacts();
const keyHere = facts.platform === 'darwin' && facts.keynoteApp !== undefined;

describe(`examples build with -f all on ${process.platform}`, () => {
  it('detects a browser for the PDF', () => {
    process.stdout.write(`machine facts: ${JSON.stringify(facts)}\n`);
    expect(facts.browser).toBeDefined();
  });

  it.each(EXAMPLES)('%s', async (example) => {
    const input = join(ROOT, 'examples', example);
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck smoke '));
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, 'build', input, '-f', 'all', '-o', outDir]);
    process.stdout.write(`${example}\n${stdout}${stderr}`);
    const files = readdirSync(outDir);
    const expected = keyHere ? ['html', 'key', 'pdf', 'pptx'] : ['html', 'pdf', 'pptx'];
    expect(files.map((f) => f.slice(f.lastIndexOf('.') + 1)).sort()).toEqual(expected);
    for (const file of files) expect(statSync(join(outDir, file)).size).toBeGreaterThan(1000);
    const pdf = files.find((f) => f.endsWith('.pdf')) ?? '';
    const pages = (await PDFDocument.load(readFileSync(join(outDir, pdf)))).getPageCount();
    expect(pages).toBe(parseDeck(readFileSync(input, 'utf8')).slides.length);
    if (keyHere) expect(stderr).toBe('');
    else expect(stderr.trim()).toMatch(/^skipped key: (Keynote is macOS-only|Keynote\.app not found)[^\n]*$/);
  });
});
