import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { browserCacheRoots, browserCandidates, newestFirst } from './browser-paths.js';
import { findBrowser } from './facts.js';

const WINDOWS_ENV = {
  LOCALAPPDATA: 'C:\\Users\\Ann Lee\\AppData\\Local',
  PROGRAMFILES: 'C:\\Program Files',
  'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
};

describe('browserCandidates (pure, every OS)', () => {
  it('finds Chrome and Edge in the Windows install folders, with backslashes and spaces intact', () => {
    const found = browserCandidates({ platform: 'win32', env: WINDOWS_ENV, home: 'C:\\Users\\Ann Lee', cacheBuilds: [] });
    expect(found).toContain('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    expect(found).toContain('C:\\Users\\Ann Lee\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe');
    expect(found).toContain('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
    expect(found.every((p) => !p.includes('/'))).toBe(true);
  });

  it('looks up the Linux browser commands on PATH, then the fixed install paths', () => {
    const found = browserCandidates({ platform: 'linux', env: { PATH: '/usr/local/bin:/usr/bin' }, home: '/home/ann', cacheBuilds: [] });
    expect(found.slice(0, 2)).toEqual(['/usr/local/bin/google-chrome-stable', '/usr/local/bin/google-chrome']);
    expect(found).toContain('/usr/bin/chromium');
    expect(found).toContain('/snap/bin/chromium');
    expect(found).toContain('/opt/microsoft/msedge/msedge');
  });

  it('checks /Applications and ~/Applications on macOS', () => {
    const found = browserCandidates({ platform: 'darwin', env: {}, home: '/Users/ann', cacheBuilds: [] });
    expect(found[0]).toBe('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    expect(found).toContain('/Users/ann/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  });

  it('reaches into Playwright and Puppeteer builds after the installed browsers', () => {
    const builds = ['/home/ann/.cache/ms-playwright/chromium-1243'];
    const found = browserCandidates({ platform: 'linux', env: {}, home: '/home/ann', cacheBuilds: builds });
    expect(found.at(-2)).toBe('/home/ann/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
    expect(found.at(-1)).toBe('/home/ann/.cache/ms-playwright/chromium-1243/chrome-linux/chrome');
    const win = browserCandidates({ platform: 'win32', env: {}, home: 'C:\\u', cacheBuilds: ['C:\\u\\pw\\chromium-1243'] });
    expect(win).toContain('C:\\u\\pw\\chromium-1243\\chrome-win64\\chrome.exe');
  });
});

describe('browserCacheRoots', () => {
  it('follows Playwright to LOCALAPPDATA on Windows and to ~/.cache on Linux', () => {
    const win = browserCacheRoots({ platform: 'win32', env: WINDOWS_ENV, home: 'C:\\Users\\Ann Lee' });
    expect(win[0]?.dir).toBe('C:\\Users\\Ann Lee\\AppData\\Local\\ms-playwright');
    expect(win[1]?.dir).toBe('C:\\Users\\Ann Lee\\.cache\\puppeteer\\chrome');
    const linux = browserCacheRoots({ platform: 'linux', env: {}, home: '/home/ann' });
    expect(linux[0]?.dir).toBe('/home/ann/.cache/ms-playwright');
  });

  it('honours PLAYWRIGHT_BROWSERS_PATH and PUPPETEER_CACHE_DIR', () => {
    const roots = browserCacheRoots({ platform: 'linux', env: { PLAYWRIGHT_BROWSERS_PATH: '/pw', PUPPETEER_CACHE_DIR: '/pp' }, home: '/h' });
    expect(roots.map((r) => r.dir)).toEqual(['/pw', '/pp/chrome']);
  });

  it('orders builds by revision number, newest first', () => {
    expect(newestFirst(['chromium-999', 'chromium-1243', 'chromium-1194'])).toEqual(['chromium-1243', 'chromium-1194', 'chromium-999']);
  });
});

describe('findBrowser (this machine)', () => {
  it('takes CHROME_PATH when it names a file and refuses it when it does not', () => {
    expect(findBrowser({ CHROME_PATH: process.execPath })).toBe(process.execPath);
    expect(findBrowser({ CHROME_PATH: `${process.execPath}-missing` })).toBeUndefined();
  });

  it('returns only a path that exists', () => {
    const found = findBrowser({ ...process.env, CHROME_PATH: '' });
    if (found !== undefined) expect(existsSync(found)).toBe(true);
  });
});
