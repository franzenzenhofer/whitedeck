import type { OutputFormat } from './format-ids.js';
import type { Deck } from './parse/deck.js';
import { renderHtml } from './render/html.js';
import { renderKey } from './render/key.js';
import { renderPdf } from './render/pdf.js';
import { renderPptx } from './render/pptx.js';

export { OUTPUT_FORMATS, isOutputFormat } from './format-ids.js';
export type { OutputFormat } from './format-ids.js';

const RENDERERS: Readonly<Record<OutputFormat, (deck: Deck, outPath: string) => Promise<void>>> = {
  html: renderHtml,
  pdf: renderPdf,
  pptx: renderPptx,
  key: renderKey,
};

export const renderFormat = async (format: OutputFormat, deck: Deck, outPath: string): Promise<void> =>
  RENDERERS[format](deck, outPath);
