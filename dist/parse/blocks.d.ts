/** A directive is a whole line of its own: `<!-- _class: x -->` or `<!-- _background: y -->`. */
export declare const DIRECTIVE_LINE: RegExp;
/**
 * Screen `content` (the markdown after front matter) and return it with HTML comments
 * blanked - they are invisible in markdown, so they never reach a slide. Directive lines
 * stay. Line count is preserved; `firstLine` is the source line number of the first line.
 */
export declare const screenBlocks: (content: string, firstLine: number) => string;
