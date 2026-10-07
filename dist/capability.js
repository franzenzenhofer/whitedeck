import { OUTPUT_FORMATS, isOutputFormat } from './format-ids.js';
const OS_NAMES = { darwin: 'macOS', linux: 'Linux', win32: 'Windows' };
const PPTX_INSTEAD = 'use -f pptx, which opens in PowerPoint, Keynote, LibreOffice Impress and Google Slides';
const BROWSER_FIX = 'install Google Chrome or Microsoft Edge, or run "npx playwright install chromium", or set CHROME_PATH to a Chrome/Chromium/Edge executable';
/** Why .key cannot be built on this OS: not macOS, or macOS without Keynote. */
export const noKeynote = (platform) => {
    if (platform !== 'darwin') {
        const os = OS_NAMES[platform] ?? platform;
        return { format: 'key', reason: `Keynote is macOS-only (this machine runs ${os})`, fix: PPTX_INSTEAD };
    }
    return {
        format: 'key',
        reason: 'Keynote.app not found (no app with bundle id com.apple.Keynote)',
        fix: `install Keynote from the Mac App Store, or ${PPTX_INSTEAD}`,
    };
};
/** Why .pdf cannot be built: CHROME_PATH points nowhere, or no browser is installed. */
export const noBrowser = (chromePathEnv) => chromePathEnv === undefined
    ? { format: 'pdf', reason: 'no Chrome, Chromium or Edge found to print the PDF', fix: BROWSER_FIX }
    : { format: 'pdf', reason: `CHROME_PATH points to no file: ${chromePathEnv}`, fix: 'fix or unset CHROME_PATH' };
/** Undefined when the format can be built on this machine, else why not and how to fix it. */
export const unavailability = (format, facts) => {
    if (format === 'key')
        return facts.platform === 'darwin' && facts.keynoteApp !== undefined ? undefined : noKeynote(facts.platform);
    if (format === 'pdf')
        return facts.browser === undefined ? noBrowser(facts.chromePathEnv) : undefined;
    return undefined;
};
/** The one stderr line for a format "all" leaves out. */
export const skipLine = (u) => `skipped ${u.format}: ${u.reason}. Fix: ${u.fix}`;
/** The error for a format the user asked for by name that cannot be built here. */
export class FormatUnavailableError extends Error {
    unavailable;
    constructor(unavailable) {
        super(`cannot build ${unavailable.format}: ${unavailable.reason}. Fix: ${unavailable.fix}`);
        this.unavailable = unavailable;
        this.name = 'FormatUnavailableError';
    }
}
const parseSpec = (spec) => {
    const parts = spec.split(',').map((part) => part.trim());
    const named = parts.filter((part) => part !== 'all').map((part) => {
        if (!isOutputFormat(part))
            throw new Error(`Unknown format "${part}". Valid: ${OUTPUT_FORMATS.join(', ')}, all`);
        return part;
    });
    return { named: [...new Set(named)], all: parts.includes('all') };
};
/**
 * Turn a -f value ("pptx", "html,pdf", "all") into what to build. A format named
 * explicitly must be buildable here or the whole build fails before anything renders;
 * "all" builds every format this machine can produce and lists the rest as skipped.
 */
export const planBuild = (spec, facts) => {
    const { named, all } = parseSpec(spec);
    for (const format of named) {
        const why = unavailability(format, facts);
        if (why !== undefined)
            throw new FormatUnavailableError(why);
    }
    if (!all)
        return { build: named, skipped: [] };
    const verdicts = OUTPUT_FORMATS.map((format) => ({ format, why: unavailability(format, facts) }));
    return {
        build: verdicts.filter((v) => v.why === undefined).map((v) => v.format),
        skipped: verdicts.flatMap((v) => (v.why === undefined ? [] : [v.why])),
    };
};
