/* CommonMark fence opener: up to three spaces, then three or more backticks or tildes.
   A backtick fence's info string may not hold a backtick - "```npm test```" alone on a
   line is inline code, not a fence (https://spec.commonmark.org/0.31.2/#fenced-code-blocks). */
const FENCE_OPEN = /^ {0,3}(?:`{3,}[^`]*|~{3,}.*)$/;
const SLIDE_SEPARATOR = /^---$/;

/**
 * Keynote White has no code style, so a fenced code block cannot be rendered faithfully.
 * It fails here, before slides are split: otherwise a `---`, a `<!-- _class -->` or a
 * `# comment` inside the fence is read as deck syntax and the deck renders mangled (P8).
 * `firstLine` is the source line number of `content`'s first line (after front matter).
 */
export const rejectCodeFences = (content: string, firstLine: number): void => {
  let slide = 1;
  for (const [index, line] of content.split('\n').entries()) {
    if (SLIDE_SEPARATOR.test(line)) slide += 1;
    else if (FENCE_OPEN.test(line)) {
      throw new Error(
        `slide ${slide}, line ${firstLine + index}: fenced code block "${line.trim()}" is not supported - ` +
          'Keynote White has no code style. Show the code as a screenshot image, or as inline `code` in a bullet.',
      );
    }
  }
};
