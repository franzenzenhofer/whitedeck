import { OUTPUT_FORMATS, isOutputFormat, type OutputFormat } from './format-ids.js';

/*
 * Which formats this machine can build, and what a -f request turns into. Pure: the
 * machine facts arrive as plain data (see env/facts.ts for where they come from), so
 * every OS is covered by unit tests on every OS.
 *
 * html  - Marp alone, no browser: always.
 * pptx  - pptxgenjs alone, no PowerPoint: always.
 * pdf   - Marp prints through a Chromium-family browser (Chrome, Chromium, Edge).
 * key   - Keynote.app imports the pptx: macOS with Keynote installed.
 */

/** The facts about this machine that decide which formats it can build. */
export interface MachineFacts {
  readonly platform: NodeJS.Platform;
  /** Where LaunchServices finds com.apple.Keynote; undefined when it is not installed. */
  readonly keynoteApp: string | undefined;
  /** The Chromium-family executable PDF printing will use; undefined when none was found. */
  readonly browser: string | undefined;
  /** CHROME_PATH as set by the user; it wins, and pointing at nothing is an error, not a hint. */
  readonly chromePathEnv: string | undefined;
}

/** Why a format cannot be built here, and the one thing that fixes it. */
export interface Unavailable {
  readonly format: OutputFormat;
  readonly reason: string;
  readonly fix: string;
}

export interface BuildPlan {
  readonly build: readonly OutputFormat[];
  readonly skipped: readonly Unavailable[];
}

const OS_NAMES: Readonly<Partial<Record<NodeJS.Platform, string>>> = { darwin: 'macOS', linux: 'Linux', win32: 'Windows' };

const PPTX_INSTEAD = 'use -f pptx, which opens in PowerPoint, Keynote, LibreOffice Impress and Google Slides';

const BROWSER_FIX =
  'install Google Chrome or Microsoft Edge, or run "npx playwright install chromium", or set CHROME_PATH to a Chrome/Chromium/Edge executable';

/** Why .key cannot be built on this OS: not macOS, or macOS without Keynote. */
export const noKeynote = (platform: NodeJS.Platform): Unavailable => {
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
export const noBrowser = (chromePathEnv: string | undefined): Unavailable =>
  chromePathEnv === undefined
    ? { format: 'pdf', reason: 'no Chrome, Chromium or Edge found to print the PDF', fix: BROWSER_FIX }
    : { format: 'pdf', reason: `CHROME_PATH points to no file: ${chromePathEnv}`, fix: 'fix or unset CHROME_PATH' };

/** Undefined when the format can be built on this machine, else why not and how to fix it. */
export const unavailability = (format: OutputFormat, facts: MachineFacts): Unavailable | undefined => {
  if (format === 'key') return facts.platform === 'darwin' && facts.keynoteApp !== undefined ? undefined : noKeynote(facts.platform);
  if (format === 'pdf') return facts.browser === undefined ? noBrowser(facts.chromePathEnv) : undefined;
  return undefined;
};

/** The one stderr line for a format "all" leaves out. */
export const skipLine = (u: Unavailable): string => `skipped ${u.format}: ${u.reason}. Fix: ${u.fix}`;

/** The error for a format the user asked for by name that cannot be built here. */
export class FormatUnavailableError extends Error {
  constructor(readonly unavailable: Unavailable) {
    super(`cannot build ${unavailable.format}: ${unavailable.reason}. Fix: ${unavailable.fix}`);
    this.name = 'FormatUnavailableError';
  }
}

const parseSpec = (spec: string): { named: OutputFormat[]; all: boolean } => {
  const parts = spec.split(',').map((part) => part.trim());
  const named = parts.filter((part) => part !== 'all').map((part) => {
    if (!isOutputFormat(part)) throw new Error(`Unknown format "${part}". Valid: ${OUTPUT_FORMATS.join(', ')}, all`);
    return part;
  });
  return { named: [...new Set(named)], all: parts.includes('all') };
};

/**
 * Turn a -f value ("pptx", "html,pdf", "all") into what to build. A format named
 * explicitly must be buildable here or the whole build fails before anything renders;
 * "all" builds every format this machine can produce and lists the rest as skipped.
 */
export const planBuild = (spec: string, facts: MachineFacts): BuildPlan => {
  const { named, all } = parseSpec(spec);
  for (const format of named) {
    const why = unavailability(format, facts);
    if (why !== undefined) throw new FormatUnavailableError(why);
  }
  if (!all) return { build: named, skipped: [] };
  const verdicts = OUTPUT_FORMATS.map((format) => ({ format, why: unavailability(format, facts) }));
  return {
    build: verdicts.filter((v) => v.why === undefined).map((v) => v.format),
    skipped: verdicts.flatMap((v) => (v.why === undefined ? [] : [v.why])),
  };
};
