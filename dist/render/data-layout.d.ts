import type { DeckSlide } from '../parse/deck.js';
import { type Placed } from './placed.js';
/** Paint list of a data slide (without the deck logo). */
export declare const placeDataSlide: (slide: DeckSlide) => Placed[];
