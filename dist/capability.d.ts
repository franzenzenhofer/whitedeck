import { type OutputFormat } from './format-ids.js';
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
/** Why .key cannot be built on this OS: not macOS, or macOS without Keynote. */
export declare const noKeynote: (platform: NodeJS.Platform) => Unavailable;
/** Why .pdf cannot be built: CHROME_PATH points nowhere, or no browser is installed. */
export declare const noBrowser: (chromePathEnv: string | undefined) => Unavailable;
/** Undefined when the format can be built on this machine, else why not and how to fix it. */
export declare const unavailability: (format: OutputFormat, facts: MachineFacts) => Unavailable | undefined;
/** The one stderr line for a format "all" leaves out. */
export declare const skipLine: (u: Unavailable) => string;
/** The error for a format the user asked for by name that cannot be built here. */
export declare class FormatUnavailableError extends Error {
    readonly unavailable: Unavailable;
    constructor(unavailable: Unavailable);
}
/**
 * Turn a -f value ("pptx", "html,pdf", "all") into what to build. A format named
 * explicitly must be buildable here or the whole build fails before anything renders;
 * "all" builds every format this machine can produce and lists the rest as skipped.
 */
export declare const planBuild: (spec: string, facts: MachineFacts) => BuildPlan;
