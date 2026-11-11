export type LogoKind = 'wordmark' | 'icon';
export interface LogoEntry {
    readonly id: string;
    readonly file: string;
    readonly label: string;
    readonly kind: LogoKind;
    readonly aspect: number;
}
export declare const LOGOS: readonly LogoEntry[];
export declare const LOGO_IDS: readonly string[];
/** The registry entry for `id` (case-insensitive), undefined when `id` is not built in. */
export declare const builtInLogo: (id: string) => LogoEntry | undefined;
/** Absolute path of a built-in logo file. */
export declare const logoPath: (entry: LogoEntry) => string;
