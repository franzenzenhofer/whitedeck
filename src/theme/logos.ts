import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/*
 * Built-in source logos for the `Logos:` line of a data slide. Files, licences and
 * provenance: assets/logos/SOURCE.md. A wordmark already shows the tool's name; an
 * icon gets its label painted next to it as native, editable text.
 */
export type LogoKind = 'wordmark' | 'icon';

export interface LogoEntry {
  readonly id: string;
  readonly file: string;
  readonly label: string;
  readonly kind: LogoKind;
  readonly aspect: number;
}

const LOGO_DIR = fileURLToPath(new URL('../../assets/logos/', import.meta.url));

export const LOGOS: readonly LogoEntry[] = JSON.parse(readFileSync(`${LOGO_DIR}logos.json`, 'utf8')) as LogoEntry[];

export const LOGO_IDS: readonly string[] = LOGOS.map((logo) => logo.id);

/** The registry entry for `id` (case-insensitive), undefined when `id` is not built in. */
export const builtInLogo = (id: string): LogoEntry | undefined => LOGOS.find((logo) => logo.id === id.toLowerCase());

/** Absolute path of a built-in logo file. */
export const logoPath = (entry: LogoEntry): string => `${LOGO_DIR}${entry.file}`;
