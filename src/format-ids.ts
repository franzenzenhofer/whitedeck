/* Format ids live apart from the renderers so the pure capability logic can use them
   without loading Marp, pptxgenjs or the Keynote bridge. */

export type OutputFormat = 'html' | 'pdf' | 'pptx' | 'key';

export const OUTPUT_FORMATS: readonly OutputFormat[] = ['html', 'pdf', 'pptx', 'key'];

export const isOutputFormat = (value: string): value is OutputFormat =>
  (OUTPUT_FORMATS as readonly string[]).includes(value);
