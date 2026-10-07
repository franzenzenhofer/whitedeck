import { requireBrowser } from '../env/facts.js';
import { runMarp } from './marp.js';
/* Marp prints the PDF through a Chromium-family browser. whitedeck picks it (env/facts.ts)
   and names it explicitly, so the browser that was detected is the one that prints. */
export const renderPdf = async (deck, outPath) => {
    await runMarp(deck, outPath, ['--pdf', '--browser-path', requireBrowser()]);
};
