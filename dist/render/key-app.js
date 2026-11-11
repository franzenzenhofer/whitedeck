import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
/*
 * Is Keynote installed? Asked of LaunchServices by bundle id, not by looking for
 * /Applications/Keynote.app: since 15.3 the Mac App Store installs it as
 * "Keynote Creator Studio.app", and users rename or move apps. `path to application id`
 * resolves without launching Keynote and errors (-1728) when no such app exists.
 */
const LOOKUP = 'POSIX path of (path to application id "com.apple.Keynote")';
/*
 * WHITEDECK_KEYNOTE=off: never drive Keynote on this machine, even when it is installed.
 * Building a .key opens windows and, on a failed import, error sheets - on a Mac where a
 * person is working that steals their screen (seen 2026-11-11). With the switch off, -f key
 * fails with the reason and "all" skips it, exactly as on a Mac without Keynote.
 */
export const KEYNOTE_SWITCH = 'WHITEDECK_KEYNOTE';
export const keynoteSwitchedOff = (env = process.env) => env[KEYNOTE_SWITCH]?.toLowerCase() === 'off';
/** The Keynote.app path on macOS, undefined anywhere else, when it is not installed, or when switched off. */
export const findKeynoteApp = async (platform, env = process.env) => {
    if (platform !== 'darwin' || keynoteSwitchedOff(env))
        return undefined;
    try {
        const { stdout } = await execFileAsync('osascript', ['-e', LOOKUP]);
        const path = stdout.trim();
        return path !== '' && existsSync(path) ? path : undefined;
    }
    catch {
        return undefined;
    }
};
