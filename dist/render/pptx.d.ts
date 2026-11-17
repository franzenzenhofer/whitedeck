import type { Deck } from '../parse/deck.js';
export declare const cellMarginsToIndents: (xml: string) => string;
export declare const renderPptx: (deck: Deck, outPath: string) => Promise<void>;
