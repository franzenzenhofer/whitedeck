export interface BrowserSearch {
    readonly platform: NodeJS.Platform;
    readonly env: Readonly<Record<string, string | undefined>>;
    readonly home: string;
    /** Installed browser builds inside the download caches (see browserCacheRoots), newest first. */
    readonly cacheBuilds: readonly string[];
}
/** A download cache and the prefix its browser build folders carry. */
export interface CacheRoot {
    readonly dir: string;
    readonly prefix: string;
}
/** The folders `npx playwright install chromium` and `npx @puppeteer/browsers install chrome` download into. */
export declare const browserCacheRoots: (search: Omit<BrowserSearch, "cacheBuilds">) => CacheRoot[];
/** Orders build folder names newest first: chromium-1243 before chromium-1194, by number not by text. */
export declare const newestFirst: (names: readonly string[]) => string[];
/** Every place a usable browser may be, in the order whitedeck prefers them. CHROME_PATH is handled by the caller. */
export declare const browserCandidates: (search: BrowserSearch) => string[];
