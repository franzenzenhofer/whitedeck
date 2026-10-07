import { describe, expect, it } from 'vitest';
import { FormatUnavailableError, planBuild, skipLine, unavailability, type MachineFacts } from './capability.js';

/* Plain facts for each machine a workshop participant may bring. No mocks: the rules
   under test are pure functions of these facts. */
const MAC_WITH_KEYNOTE: MachineFacts = {
  platform: 'darwin',
  keynoteApp: '/Applications/Keynote.app/',
  browser: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  chromePathEnv: undefined,
};
const MAC_WITHOUT_KEYNOTE: MachineFacts = { ...MAC_WITH_KEYNOTE, keynoteApp: undefined };
const LINUX: MachineFacts = { platform: 'linux', keynoteApp: undefined, browser: '/usr/bin/google-chrome', chromePathEnv: undefined };
const WINDOWS: MachineFacts = {
  platform: 'win32',
  keynoteApp: undefined,
  browser: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  chromePathEnv: undefined,
};
const LINUX_NO_BROWSER: MachineFacts = { ...LINUX, browser: undefined };

describe('unavailability', () => {
  it('builds html and pptx on every machine, browser or not', () => {
    for (const facts of [MAC_WITH_KEYNOTE, LINUX, WINDOWS, LINUX_NO_BROWSER]) {
      expect(unavailability('html', facts)).toBeUndefined();
      expect(unavailability('pptx', facts)).toBeUndefined();
    }
  });

  it('builds key only on macOS with Keynote installed', () => {
    expect(unavailability('key', MAC_WITH_KEYNOTE)).toBeUndefined();
    expect(unavailability('key', MAC_WITHOUT_KEYNOTE)?.reason).toBe('Keynote.app not found (no app with bundle id com.apple.Keynote)');
    expect(unavailability('key', LINUX)?.reason).toBe('Keynote is macOS-only (this machine runs Linux)');
    expect(unavailability('key', WINDOWS)?.reason).toBe('Keynote is macOS-only (this machine runs Windows)');
  });

  it('a Keynote path reported on a non-Mac still does not make key buildable', () => {
    expect(unavailability('key', { ...LINUX, keynoteApp: '/x/Keynote.app' })?.format).toBe('key');
  });

  it('needs a browser for pdf and names the install that fixes it', () => {
    expect(unavailability('pdf', WINDOWS)).toBeUndefined();
    const why = unavailability('pdf', LINUX_NO_BROWSER);
    expect(why?.reason).toMatch(/no Chrome, Chromium or Edge/);
    expect(why?.fix).toContain('npx playwright install chromium');
  });

  it('blames CHROME_PATH when it points at nothing instead of suggesting an install', () => {
    const why = unavailability('pdf', { ...LINUX_NO_BROWSER, chromePathEnv: '/nope/chrome' });
    expect(why?.reason).toBe('CHROME_PATH points to no file: /nope/chrome');
  });
});

describe('planBuild: "all" skips, a named format fails', () => {
  it('"all" builds all four formats on a Mac with Keynote', () => {
    expect(planBuild('all', MAC_WITH_KEYNOTE)).toEqual({ build: ['html', 'pdf', 'pptx', 'key'], skipped: [] });
  });

  it('"all" on Linux and Windows builds html, pdf, pptx and skips key with its reason', () => {
    for (const facts of [LINUX, WINDOWS]) {
      const plan = planBuild('all', facts);
      expect(plan.build).toEqual(['html', 'pdf', 'pptx']);
      expect(plan.skipped.map((s) => s.format)).toEqual(['key']);
    }
  });

  it('"all" without a browser still builds html and pptx', () => {
    const plan = planBuild('all', LINUX_NO_BROWSER);
    expect(plan.build).toEqual(['html', 'pptx']);
    expect(plan.skipped.map((s) => s.format)).toEqual(['pdf', 'key']);
  });

  it('a named format that cannot be built fails before anything renders', () => {
    expect(() => planBuild('key', LINUX)).toThrow(FormatUnavailableError);
    expect(() => planBuild('html,key', WINDOWS)).toThrow(/^cannot build key: Keynote is macOS-only \(this machine runs Windows\)\. Fix: use -f pptx/);
    expect(() => planBuild('pdf', LINUX_NO_BROWSER)).toThrow(/^cannot build pdf: /);
  });

  it('a format named next to "all" must be buildable too', () => {
    expect(() => planBuild('all,key', LINUX)).toThrow(/cannot build key/);
  });

  it('keeps the order of an explicit list and drops duplicates', () => {
    expect(planBuild('pptx, html,pptx', LINUX)).toEqual({ build: ['pptx', 'html'], skipped: [] });
  });

  it('rejects an unknown format by name', () => {
    expect(() => planBuild('docx', LINUX)).toThrow('Unknown format "docx". Valid: html, pdf, pptx, key, all');
  });

  it('prints one skip line per skipped format, reason and fix on the same line', () => {
    const [skipped] = planBuild('all', LINUX).skipped;
    const line = skipLine(skipped ?? { format: 'key', reason: '', fix: '' });
    expect(line).toMatch(/^skipped key: Keynote is macOS-only \(this machine runs Linux\)\. Fix: use -f pptx/);
    expect(line).not.toContain('\n');
  });
});
