import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findKeynoteApp } from '../render/key-app.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SERVER = join(ROOT, '..', 'dist', 'mcp', 'server.js');
const keynoteHere = (await findKeynoteApp(process.platform)) !== undefined;

const textOf = (result: Record<string, unknown>): string =>
  (result['content'] as { type: string; text: string }[])[0]?.text ?? '';

describe('whitedeck MCP server (real stdio round-trip)', () => {
  const client = new Client({ name: 'whitedeck-test', version: '0.0.0' });

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVER],
    });
    await client.connect(transport);
  }, 60_000);

  afterAll(async () => {
    await client.close();
  });

  it('lists the whitedeck tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    expect(names).toEqual(['whitedeck_build', 'whitedeck_layouts', 'whitedeck_validate']);
  });

  it('returns all 12 layouts', async () => {
    const result = await client.callTool({ name: 'whitedeck_layouts', arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
    const layouts = JSON.parse(text) as { id: string }[];
    expect(layouts).toHaveLength(12);
  });

  it('validates markdown', async () => {
    const result = await client.callTool({
      name: 'whitedeck_validate',
      arguments: { markdown: '# Hi\n\n---\n\n- a' },
    });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
    expect(JSON.parse(text)).toMatchObject({ ok: true, slides: 2 });
  });

  it('builds a pptx from markdown', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-mcp-'));
    const result = await client.callTool({
      name: 'whitedeck_build',
      arguments: { markdown: '# From MCP', formats: ['pptx'], outDir, name: 'mcp-demo' },
    });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
    const report = JSON.parse(text) as { files: string[] };
    expect(report.files).toHaveLength(1);
    expect(existsSync(report.files[0] ?? '')).toBe(true);
  });

  it('names the file after the deck title when no name is given', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-mcp-'));
    const result = await client.callTool({
      name: 'whitedeck_build',
      arguments: { markdown: '# Ueber die Zukunft der Suche', formats: ['pptx'], outDir },
    });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
    const report = JSON.parse(text) as { files: string[] };
    expect(report.files[0]).toBe(join(outDir, 'ueber-die-zukunft-der-suche.pptx'));
    expect(existsSync(report.files[0] ?? '')).toBe(true);
  });
});

describe('whitedeck MCP server on a machine without a browser', () => {
  const client = new Client({ name: 'whitedeck-test-no-browser', version: '0.0.0' });

  beforeAll(async () => {
    const env = { ...process.env, CHROME_PATH: join(tmpdir(), 'no-such-browser', 'chrome') } as Record<string, string>;
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER], env }));
  }, 60_000);

  afterAll(async () => {
    await client.close();
  });

  it('fails a build that names pdf explicitly, with the reason', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-mcp-'));
    const result = await client.callTool({ name: 'whitedeck_build', arguments: { markdown: '# No PDF', formats: ['pdf'], outDir } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('cannot build pdf: CHROME_PATH points to no file');
  });

  it.skipIf(keynoteHere)('builds what "all" can and reports the skipped formats with reason and fix', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-mcp-'));
    const result = await client.callTool({ name: 'whitedeck_build', arguments: { markdown: '# All here', formats: ['all'], outDir } });
    const report = JSON.parse(textOf(result)) as { files: string[]; built: string[]; skipped: { format: string; reason: string; fix: string }[] };
    expect(report.built).toEqual(['html', 'pptx']);
    expect(report.skipped.map((s) => s.format)).toEqual(['pdf', 'key']);
    expect(report.skipped.every((s) => s.reason !== '' && s.fix !== '')).toBe(true);
    expect(report.files.every((f) => existsSync(f))).toBe(true);
  });
});
