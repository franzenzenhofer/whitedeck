/* Ubuntu 23.10+ blocks unprivileged user namespaces through AppArmor, so a downloaded
   Chromium (Playwright, Puppeteer) has no usable sandbox there and Marp's launch dies with
   "No usable sandbox!". Marp switches the sandbox off when CHROME_NO_SANDBOX is set.
   On Linux whitedeck sets it, the same default Playwright uses (chromiumSandbox: false):
   the browser only renders the deck whitedeck itself just wrote. */
/** The environment for the Marp child process on the given platform. */
export const marpEnv = (platform, env) => platform === 'linux' ? { ...env, CHROME_NO_SANDBOX: '1' } : { ...env };
