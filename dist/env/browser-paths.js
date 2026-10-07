import { posix, win32 } from 'node:path';
const pathOf = (platform) => (platform === 'win32' ? win32 : posix);
const MAC_APPS = [
    'Google Chrome.app/Contents/MacOS/Google Chrome',
    'Chromium.app/Contents/MacOS/Chromium',
    'Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
];
const LINUX_COMMANDS = [
    'google-chrome-stable',
    'google-chrome',
    'chromium-browser',
    'chromium',
    'microsoft-edge-stable',
    'microsoft-edge',
];
const LINUX_FIXED = ['/opt/google/chrome/chrome', '/snap/bin/chromium', '/opt/microsoft/msedge/msedge'];
const WINDOWS_APPS = [
    ['Google', 'Chrome', 'Application', 'chrome.exe'],
    ['Microsoft', 'Edge', 'Application', 'msedge.exe'],
    ['Chromium', 'Application', 'chrome.exe'],
];
/* Inside one Playwright or Puppeteer build folder, the executable sits under one of these. */
const CACHE_EXECUTABLES = {
    linux: ['chrome-linux64/chrome', 'chrome-linux/chrome'],
    win32: ['chrome-win64\\chrome.exe', 'chrome-win\\chrome.exe'],
    darwin: [
        'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    ],
};
const playwrightCache = ({ platform, env, home }) => {
    const p = pathOf(platform);
    if (env['PLAYWRIGHT_BROWSERS_PATH'] !== undefined)
        return env['PLAYWRIGHT_BROWSERS_PATH'];
    if (platform === 'win32')
        return p.join(env['LOCALAPPDATA'] ?? p.join(home, 'AppData', 'Local'), 'ms-playwright');
    if (platform === 'darwin')
        return p.join(home, 'Library', 'Caches', 'ms-playwright');
    return p.join(env['XDG_CACHE_HOME'] ?? p.join(home, '.cache'), 'ms-playwright');
};
/** The folders `npx playwright install chromium` and `npx @puppeteer/browsers install chrome` download into. */
export const browserCacheRoots = (search) => {
    const p = pathOf(search.platform);
    const puppeteer = search.env['PUPPETEER_CACHE_DIR'] ?? p.join(search.home, '.cache', 'puppeteer');
    return [
        { dir: playwrightCache(search), prefix: 'chromium-' },
        { dir: p.join(puppeteer, 'chrome'), prefix: '' },
    ];
};
/** Orders build folder names newest first: chromium-1243 before chromium-1194, by number not by text. */
export const newestFirst = (names) => [...names].sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
const pathDirs = ({ platform, env }) => (env['PATH'] ?? env['Path'] ?? '').split(pathOf(platform).delimiter).filter((dir) => dir !== '');
const installed = (search) => {
    const { platform, env, home } = search;
    const p = pathOf(platform);
    if (platform === 'darwin') {
        return ['/Applications', p.join(home, 'Applications')].flatMap((dir) => MAC_APPS.map((app) => p.join(dir, app)));
    }
    if (platform === 'win32') {
        const bases = [env['LOCALAPPDATA'], env['PROGRAMFILES'], env['PROGRAMFILES(X86)']].filter((b) => b !== undefined);
        return WINDOWS_APPS.flatMap((parts) => bases.map((base) => p.join(base, ...parts)));
    }
    const onPath = pathDirs(search).flatMap((dir) => LINUX_COMMANDS.map((cmd) => p.join(dir, cmd)));
    return [...onPath, ...LINUX_FIXED];
};
/** Every place a usable browser may be, in the order whitedeck prefers them. CHROME_PATH is handled by the caller. */
export const browserCandidates = (search) => {
    const p = pathOf(search.platform);
    const inCaches = search.cacheBuilds.flatMap((build) => (CACHE_EXECUTABLES[search.platform] ?? []).map((exe) => p.join(build, exe)));
    return [...new Set([...installed(search), ...inCaches])];
};
