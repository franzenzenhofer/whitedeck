import type { OutputFormat } from './format-ids.js';
import type { Deck } from './parse/deck.js';
export { OUTPUT_FORMATS, isOutputFormat } from './format-ids.js';
export type { OutputFormat } from './format-ids.js';
export declare const renderFormat: (format: OutputFormat, deck: Deck, outPath: string) => Promise<void>;
