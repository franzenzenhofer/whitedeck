import { describe, expect, it } from 'vitest';
import { marpEnv } from './marp-env.js';

describe('marpEnv', () => {
  it('turns the Chromium sandbox off on Linux, where AppArmor may block it', () => {
    expect(marpEnv('linux', { PATH: '/usr/bin' })).toEqual({ PATH: '/usr/bin', CHROME_NO_SANDBOX: '1' });
  });

  it('leaves the sandbox on for macOS and Windows', () => {
    expect(marpEnv('darwin', { PATH: '/usr/bin' })).toEqual({ PATH: '/usr/bin' });
    expect(marpEnv('win32', { Path: 'C:\\Windows' })).toEqual({ Path: 'C:\\Windows' });
  });

  it('does not change the environment it was given', () => {
    const env = { PATH: '/usr/bin' };
    marpEnv('linux', env);
    expect(env).toEqual({ PATH: '/usr/bin' });
  });
});
