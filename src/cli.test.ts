import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { findKeynoteApp } from './render/key-app.js';

const execFileAsync = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(ROOT, 'dist', 'cli.js');
const DEMO = join(ROOT, 'examples', 'demo.md');
/* CHROME_PATH naming a missing file makes pdf unbuildable on every OS, deterministically. */
const NO_BROWSER = { ...process.env, CHROME_PATH: join(tmpdir(), 'no-such-browser', 'chrome') };
const keynoteHere = (await findKeynoteApp(process.platform)) !== undefined;

/* The TypeScript compiler run through node itself: `npm` is npm.cmd on Windows and
   cannot be spawned without a shell. */
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

const runCli = async (
  args: readonly string[],
  input?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolvePromise) => {
    const child = execFile(process.execPath, [CLI, ...args], { env }, (error, stdout, stderr) => {
      resolvePromise({ code: child.exitCode ?? (error ? 1 : 0), stdout, stderr });
    });
    if (input !== undefined) child.stdin?.end(input);
  });

describe('whitedeck CLI (built artifact, end to end)', () => {
  beforeAll(async () => {
    await execFileAsync(process.execPath, [TSC, '-p', 'tsconfig.build.json'], { cwd: ROOT });
  }, 120_000);

  it('names every output after the deck title, not after the input file', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr, stdout } = await runCli(['build', DEMO, '-f', 'html,pdf,pptx', '-o', outDir]);

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'whitedeck-demo.html'))).toBe(true);
    expect(existsSync(join(outDir, 'whitedeck-demo.pdf'))).toBe(true);
    expect(existsSync(join(outDir, 'whitedeck-demo.pptx'))).toBe(true);
    expect(stdout).toContain('whitedeck-demo.pptx');
  });

  it('names a stdin deck after its headline instead of "deck"', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code } = await runCli(['build', '-', '-f', 'pptx', '-o', outDir], '# From stdin');
    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'from-stdin.pptx'))).toBe(true);
    expect(existsSync(join(outDir, 'deck.pptx'))).toBe(false);
  });

  it('honours an explicit --name over the deck title', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code } = await runCli(['build', DEMO, '-f', 'pptx', '-o', outDir, '--name', 'board-2026-q3']);
    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'board-2026-q3.pptx'))).toBe(true);
  });

  it('writes to an -o path that names a file, taking the format from its extension', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const target = join(outDir, 'nested', 'investor-update.pptx');
    const { code, stderr } = await runCli(['build', DEMO, '-o', target]);
    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(existsSync(target)).toBe(true);
  });

  it('refuses an -o file path when several formats are requested', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr } = await runCli(['build', DEMO, '-f', 'html,pptx', '-o', join(outDir, 'x.pptx')]);
    expect(code).toBe(2);
    expect(stderr).toMatch(/single format/i);
  });

  it('fails loudly when a stdin deck has no title to name the file after', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr } = await runCli(['build', '-', '-f', 'pptx', '-o', outDir], '- only a bullet');
    expect(code).toBe(1);
    expect(stderr).toMatch(/no title/i);
  });

  it('init scaffolds a deck that builds standalone, images included', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-init-'));
    const initRes = await runCli(['init', join(outDir, 'my.md')]);
    expect(initRes.code).toBe(0);
    const buildRes = await runCli(['build', join(outDir, 'my.md'), '-f', 'pptx']);
    expect(buildRes.stderr).toBe('');
    expect(buildRes.code).toBe(0);
    expect(existsSync(join(outDir, 'whitedeck-demo.pptx'))).toBe(true);
  });

  it('lists all 12 layouts as json', async () => {
    const { code, stdout } = await runCli(['layouts', '--json']);
    expect(code).toBe(0);
    const layouts = JSON.parse(stdout) as { id: string }[];
    expect(layouts).toHaveLength(12);
    expect(layouts.map((l) => l.id)).toContain('title-bullets');
  });

  it('validates a good deck with exit 0 and machine-readable output', async () => {
    const { code, stdout } = await runCli(['validate', DEMO]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ ok: true, slides: 8 });
  });

  it('fails validation of an unknown layout with exit 1', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const bad = join(outDir, 'bad.md');
    writeFileSync(bad, '<!-- _class: nope -->\n');
    const { code, stderr } = await runCli(['validate', bad]);
    expect(code).toBe(1);
    expect(stderr).toContain('nope');
  });

  it('fails validation of a deck carrying theme dummy copy with exit 1', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const bad = join(outDir, 'dummy.md');
    writeFileSync(bad, '<!-- _class: quote -->\n\n> Type a quote here.\n> -- Johnny Appleseed\n');
    const { code, stdout } = await runCli(['validate', bad]);
    expect(code).toBe(1);
    const report = JSON.parse(stdout) as { ok: boolean; errors: string[] };
    expect(report.ok).toBe(false);
    expect(report.errors).toHaveLength(2);
  });

  it('prints usage with exit 2 on unknown commands', async () => {
    const { code, stderr } = await runCli(['frobnicate']);
    expect(code).toBe(2);
    expect(stderr).toContain('Usage');
  });
});

describe('whitedeck CLI: what this machine cannot build', () => {
  it('fails an explicitly requested format it cannot build: exit 1, one line, nothing written', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr } = await runCli(['build', DEMO, '-f', 'html,pptx,pdf', '-o', outDir], undefined, NO_BROWSER);
    expect(code).toBe(1);
    expect(stderr.trim().split('\n')).toHaveLength(1);
    expect(stderr).toMatch(/^cannot build pdf: CHROME_PATH points to no file: .+\. Fix: fix or unset CHROME_PATH/);
    expect(readdirSync(outDir)).toEqual([]);
  });

  it.skipIf(keynoteHere)('fails -f key without Keynote, naming the reason and pptx as the fix', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr } = await runCli(['build', DEMO, '-f', 'key', '-o', outDir]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/^cannot build key: (Keynote is macOS-only|Keynote\.app not found).*Fix: .*-f pptx/);
  });

  it.skipIf(keynoteHere)('-f all builds what it can, skips the rest with one stderr line each, exit 0', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-cli-'));
    const { code, stderr, stdout } = await runCli(['build', DEMO, '-f', 'all', '-o', outDir], undefined, NO_BROWSER);
    expect(code).toBe(0);
    expect(stderr.trim().split('\n')).toEqual([
      expect.stringMatching(/^skipped pdf: CHROME_PATH points to no file/),
      expect.stringMatching(/^skipped key: /),
    ]);
    expect(readdirSync(outDir).sort()).toEqual(['whitedeck-demo.html', 'whitedeck-demo.pptx']);
    expect(stdout.trim().split('\n')).toHaveLength(2);
  });
});
