import type { Deck } from './parse/deck.js';
export interface LintReport {
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
}
export declare const lintDeck: (deck: Deck) => LintReport;
