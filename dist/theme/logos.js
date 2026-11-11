import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const LOGO_DIR = fileURLToPath(new URL('../../assets/logos/', import.meta.url));
export const LOGOS = JSON.parse(readFileSync(`${LOGO_DIR}logos.json`, 'utf8'));
export const LOGO_IDS = LOGOS.map((logo) => logo.id);
/** The registry entry for `id` (case-insensitive), undefined when `id` is not built in. */
export const builtInLogo = (id) => LOGOS.find((logo) => logo.id === id.toLowerCase());
/** Absolute path of a built-in logo file. */
export const logoPath = (entry) => `${LOGO_DIR}${entry.file}`;
