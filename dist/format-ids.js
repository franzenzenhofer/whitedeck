/* Format ids live apart from the renderers so the pure capability logic can use them
   without loading Marp, pptxgenjs or the Keynote bridge. */
export const OUTPUT_FORMATS = ['html', 'pdf', 'pptx', 'key'];
export const isOutputFormat = (value) => OUTPUT_FORMATS.includes(value);
