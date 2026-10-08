/* Block-level markdown is screened line by line BEFORE slides are split, because the
   split and every directive are line-based: a `---`, a `<!-- _class -->` or a `# title`
   inside a code fence or an HTML comment would otherwise act on the deck. Rules follow
   CommonMark (https://spec.commonmark.org/0.31.2/#fenced-code-blocks,
   https://spec.commonmark.org/0.31.2/#html-blocks) and GFM tables
   (https://github.github.com/gfm/#tables-extension-). */
const FENCE_OPEN = /^ {0,3}(?:`{3,}[^`]*|~{3,}.*)$/;
const COMMENT_OPEN = /^ {0,3}<!--/;
const COMMENT_CLOSE = '-->';
/** A directive is a whole line of its own: `<!-- _class: x -->` or `<!-- _background: y -->`. */
export const DIRECTIVE_LINE = /^\s*<!--\s*_(class|background):\s*([^\s>]+)\s*-->\s*$/;
const MINOR_HEADING = /^ {0,3}#{3,6}(?:\s|$)/;
const TABLE_DELIMITER = /^[\s|:-]+$/;
const SLIDE_SEPARATOR = /^---$/;

const isTableDelimiter = (line: string): boolean =>
  TABLE_DELIMITER.test(line) && line.includes('|') && line.includes('-');

const unsupported = (slide: number, line: number, what: string, hint: string): Error =>
  new Error(`slide ${slide}, line ${line}: ${what} is not supported - ${hint}`);

/* Keynote White has none of these, so each fails loudly instead of rendering mangled (P8). */
const rejectUnpaintable = (lines: readonly string[], index: number, slide: number, lineNo: number): void => {
  const line = lines[index] ?? '';
  if (FENCE_OPEN.test(line)) {
    throw unsupported(slide, lineNo, `fenced code block "${line.trim()}"`,
      'Keynote White has no code style. Show the code as a screenshot image, or as inline `code` in a bullet.');
  }
  if (MINOR_HEADING.test(line)) {
    throw unsupported(slide, lineNo, `heading "${line.trim()}"`,
      'a slide has one "# title" and one "## subtitle". Use a **bold** bullet for a sub-heading.');
  }
  const next = lines[index + 1];
  if (line.includes('|') && next !== undefined && isTableDelimiter(next)) {
    throw unsupported(slide, lineNo, `table "${line.trim()}"`,
      'Keynote White has no table style. Use the compare layout, bullets, or a screenshot image.');
  }
};

/**
 * Screen `content` (the markdown after front matter) and return it with HTML comments
 * blanked - they are invisible in markdown, so they never reach a slide. Directive lines
 * stay. Line count is preserved; `firstLine` is the source line number of the first line.
 */
export const screenBlocks = (content: string, firstLine: number): string => {
  const lines = content.split('\n');
  let slide = 1;
  let commentStart: number | undefined;
  const screened = lines.map((line, index) => {
    if (commentStart !== undefined) {
      if (line.includes(COMMENT_CLOSE)) commentStart = undefined;
      return '';
    }
    if (DIRECTIVE_LINE.test(line)) return line;
    if (COMMENT_OPEN.test(line)) {
      if (!line.slice(line.indexOf('<!--') + 4).includes(COMMENT_CLOSE)) commentStart = index;
      return '';
    }
    if (SLIDE_SEPARATOR.test(line)) slide += 1;
    else rejectUnpaintable(lines, index, slide, firstLine + index);
    return line;
  });
  if (commentStart !== undefined) {
    throw new Error(`slide ${slide}, line ${firstLine + commentStart}: HTML comment "<!--" is never closed with "-->"`);
  }
  return screened.join('\n');
};
