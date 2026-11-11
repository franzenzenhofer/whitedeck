export declare const KEYNOTE_SWITCH = "WHITEDECK_KEYNOTE";
export declare const keynoteSwitchedOff: (env?: NodeJS.ProcessEnv) => boolean;
/** The Keynote.app path on macOS, undefined anywhere else, when it is not installed, or when switched off. */
export declare const findKeynoteApp: (platform: NodeJS.Platform, env?: NodeJS.ProcessEnv) => Promise<string | undefined>;
