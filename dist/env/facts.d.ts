import { type MachineFacts } from '../capability.js';
/** The browser PDF printing uses here: CHROME_PATH if set (and only then), else the first one installed. */
export declare const findBrowser: (env?: NodeJS.ProcessEnv) => string | undefined;
/** Probe this machine once: OS, Keynote, browser. */
export declare const machineFacts: (env?: NodeJS.ProcessEnv) => Promise<MachineFacts>;
/** The browser for PDF printing, or the same loud error -f pdf gives when there is none. */
export declare const requireBrowser: (env?: NodeJS.ProcessEnv) => string;
