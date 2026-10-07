import { renderHtml } from './render/html.js';
import { renderKey } from './render/key.js';
import { renderPdf } from './render/pdf.js';
import { renderPptx } from './render/pptx.js';
export { OUTPUT_FORMATS, isOutputFormat } from './format-ids.js';
const RENDERERS = {
    html: renderHtml,
    pdf: renderPdf,
    pptx: renderPptx,
    key: renderKey,
};
export const renderFormat = async (format, deck, outPath) => RENDERERS[format](deck, outPath);
