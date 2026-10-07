import type { Deck } from '../parse/deck.js';
/**
 * An absolute file path as a root-relative URL path that CommonMark accepts: forward
 * slashes, every segment percent-encoded (spaces, parentheses), a Windows drive kept
 * readable (`C:\My Decks\a.png` becomes `/C:/My%20Decks/a.png`). Not a `file:` URL:
 * markdown-it refuses that scheme and prints the image as literal text.
 */
export declare const imageUrlPath: (abs: string, separator: string) => string;
/** Emit canonical Marp markdown so the theme's DOM mapping is deterministic. */
export declare const toMarpMarkdown: (deck: Deck) => string;
