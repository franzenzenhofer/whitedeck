import type { DeckSlide } from '../parse/deck.js';
import { type PtRect } from '../theme/scope.js';
import { type Placed } from './placed.js';
export declare const evidence: (slide: DeckSlide, band: PtRect) => Placed[];
