import { type DeckLogo, type DeckTable } from './data-fields.js';
export type { CellAlign, DeckLogo, DeckTable } from './data-fields.js';
export interface DeckBullet {
    readonly text: string;
    readonly level: number;
}
export interface DeckColumn {
    readonly header: string;
    readonly bullets: readonly DeckBullet[];
}
/** An image with the attributes carried in its alt text: `![border=red label="JS on"](x.png)`. */
export interface DeckImage {
    readonly path: string;
    /** Border colour as `#rrggbb`; absent = no border. */
    readonly border?: string;
    /** Label bar text above the image (scope-compare). */
    readonly label?: string;
}
export interface DeckSlide {
    readonly layout: string;
    /** Per-slide background colour from `<!-- _background: #RRGGBB -->`. White when absent. */
    readonly background?: string;
    readonly title?: string;
    readonly subtitle?: string;
    readonly bullets: readonly DeckBullet[];
    readonly images: readonly DeckImage[];
    readonly quote?: string;
    readonly attribution?: string;
    readonly source?: string;
    readonly columns?: readonly DeckColumn[];
    /** `Scope:` header text of a scope layout (inline markdown allowed). */
    readonly scope?: string;
    /** `Tool:` logo image path shown top-right of a scope layout. */
    readonly tool?: string;
    /** `Caption:` small grey line at the bottom (inline markdown allowed). */
    readonly caption?: string;
    /** `Footer:` free text line at the bottom-left (title-left). */
    readonly footer?: string;
    /** `Tags:` pills right of the headline (data layout). */
    readonly tags?: readonly string[];
    /** `Logos:` source logos right of the tags (data layout). */
    readonly logos?: readonly DeckLogo[];
    /** `Context:` small line under the headline row (data layout). */
    readonly context?: string;
    /** `Conclusion:` the finding, one sentence under the headline (data layout). */
    readonly conclusion?: string;
    /** A GFM table, painted as a native table (data layout). */
    readonly table?: DeckTable;
    /** `Notes:` presenter notes, one paragraph per line. */
    readonly notes?: string;
}
export interface DeckMeta {
    readonly title?: string;
    readonly author?: string;
    /** Image painted bottom-right on every slide. */
    readonly logo?: string;
    /** `scope-title: one-line` - scope-layout headlines are sized to fit ONE line (min 30pt) instead of wrapping. */
    readonly scopeTitle?: 'one-line';
}
export interface Deck {
    readonly meta: DeckMeta;
    readonly slides: readonly DeckSlide[];
}
export declare const parseDeck: (markdown: string) => Deck;
