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

/** The Keynote.app path on macOS, undefined anywhere else or when it is not installed. */
export const findKeynoteApp = async (platform: NodeJS.Platform): Promise<string | undefined> => {
  if (platform !== 'darwin') return undefined;
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', LOOKUP]);
    const path = stdout.trim();
    return path !== '' && existsSync(path) ? path : undefined;
  } catch {
    return undefined;
  }
};
