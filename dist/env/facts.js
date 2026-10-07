import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { FormatUnavailableError, noBrowser } from '../capability.js';
import { findKeynoteApp } from '../render/key-app.js';
import { browserCacheRoots, browserCandidates, newestFirst } from './browser-paths.js';
/* The only place that looks at the real machine. Everything it learns is handed on as
   plain data to the pure rules in capability.ts and browser-paths.ts. */
const isFile = (path) => {
    try {
        return statSync(path).isFile();
    }
    catch {
        return false;
    }
};
const listBuilds = (dir, prefix) => {
    if (!existsSync(dir))
        return [];
    const names = readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
        .map((entry) => entry.name);
    return newestFirst(names).map((name) => join(dir, name));
};
/** The browser PDF printing uses here: CHROME_PATH if set (and only then), else the first one installed. */
export const findBrowser = (env = process.env) => {
    const explicit = env['CHROME_PATH'];
    if (explicit !== undefined && explicit !== '')
        return isFile(explicit) ? explicit : undefined;
    const base = { platform: process.platform, env, home: homedir() };
    const cacheBuilds = browserCacheRoots(base).flatMap((root) => listBuilds(root.dir, root.prefix));
    const search = { ...base, cacheBuilds };
    return browserCandidates(search).find(isFile);
};
/** Probe this machine once: OS, Keynote, browser. */
export const machineFacts = async (env = process.env) => ({
    platform: process.platform,
    keynoteApp: await findKeynoteApp(process.platform),
    browser: findBrowser(env),
    chromePathEnv: chromePathOf(env),
});
const chromePathOf = (env) => env['CHROME_PATH'] === undefined || env['CHROME_PATH'] === '' ? undefined : env['CHROME_PATH'];
/** The browser for PDF printing, or the same loud error -f pdf gives when there is none. */
export const requireBrowser = (env = process.env) => {
    const browser = findBrowser(env);
    if (browser === undefined)
        throw new FormatUnavailableError(noBrowser(chromePathOf(env)));
    return browser;
};
