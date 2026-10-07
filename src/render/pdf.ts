import { requireBrowser } from '../env/facts.js';
import type { Deck } from '../parse/deck.js';
import { runMarp } from './marp.js';

/* Marp prints the PDF through a Chromium-family browser. whitedeck picks it (env/facts.ts)
   and names it explicitly, so the browser that was detected is the one that prints. */
export const renderPdf = async (deck: Deck, outPath: string): Promise<void> => {
  await runMarp(deck, outPath, ['--pdf', '--browser-path', requireBrowser()]);
};
