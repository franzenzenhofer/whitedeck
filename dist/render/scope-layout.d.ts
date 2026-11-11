import type { DeckMeta, DeckSlide } from '../parse/deck.js';
import { type Placed } from './placed.js';
export type { Placed, PlacedBullets, PlacedImage, PlacedNotes, PlacedPill, PlacedRect, PlacedTable, PlacedText } from './placed.js';
export declare const ONE_LINE_GLYPH_EM = 0.54;
/**
 * Paint list of a custom (scope / left) layout slide. Throws for any other
 * layout - callers branch on `isCustomLayout` first.
 */
export declare const placeCustomSlide: (slide: DeckSlide, meta: DeckMeta) => Placed[];
/** The logo alone - painted on the Keynote-geometry layouts too. */
export declare const placeLogo: (meta: DeckMeta) => Placed[];
export declare const NOTE_STYLE: {
    readonly bulletSizePct: 123;
    readonly spaceBeforePt: 30;
    readonly indentEm: 1;
};
