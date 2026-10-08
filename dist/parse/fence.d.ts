/**
 * Keynote White has no code style, so a fenced code block cannot be rendered faithfully.
 * It fails here, before slides are split: otherwise a `---`, a `<!-- _class -->` or a
 * `# comment` inside the fence is read as deck syntax and the deck renders mangled (P8).
 * `firstLine` is the source line number of `content`'s first line (after front matter).
 */
export declare const rejectCodeFences: (content: string, firstLine: number) => void;
