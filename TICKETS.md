# whitedeck Tickets - 2026-08-24 (Schwabe deck image bug)

## Root cause of the reported bug (7 Whys, investigation complete)

Symptom: 186-slide Schwabe deck - HTML showed literal `![](...)` text on all 46 photo slides,
PDF had 186 pages and 0 embedded images. PPTX and .key were correct.

1. Why no images in the PDF? The PDF is printed from the same Marp HTML render, which contained no `<img>` elements.
2. Why no `<img>` in the HTML? The `![](...)` lines reached the browser as literal raw text, never parsed as markdown.
3. Why literal? A line starting with `<h1 ...>` opens a CommonMark raw-HTML block that ends only at a blank line; `toMarpMarkdown` emitted the image line immediately after `</h1>` with no blank line, so markdown-it swallowed it into the raw block.
4. Why was the title raw HTML? The Keynote-style auto-shrink emits `<h1 style="font-size: Xpt">` whenever a title would overflow its placeholder box.
5. Why did every photo slide shrink? Photo-layout title boxes are short (211px) and the width heuristic (0.56em/glyph) overestimates line count, so almost any real headline triggers shrink (verified: the 38-char skill-doc example headline shrinks to 84pt).
6. Why didn't tests catch it? The autoshrink test asserted only the `<h1>` tag itself; no test rendered a shrunk-title slide with following content through real markdown-it semantics.
7. Why was the emitter fragile? It joins block lines with single newlines and relies on markdown context; injecting raw HTML blocks into that stream silently changes the parsing of every following line.

**Status: root cause FIXED in commit `f56c6c3` (blank line emitted after any raw `<h1>`), dist/ rebuilt, global npm-linked binary verified fixed** - repro `photo-horizontal + long title + image + Source:` now renders `<h1 style="font-size: 84pt">`, exactly one `<img>`, zero literal `![]`.

---

## T1 - Rebuild the Schwabe deck (stale broken artifacts)

`.../schwabe/2026/meeting-2026-08-31/deck-out/` was built 15:57-15:58, BEFORE the 16:02 fix.
The HTML/PDF there are still broken. Action: rerun
`whitedeck build DECK-2026-08-31.md -f all -o deck-out/` and verify: HTML contains 46 `<img>`
whose src resolve; PDF has 186 pages AND >0 `/Subtype /Image` objects; spot-check 3 photo
slides visually; PPTX/.key rebuild to equivalent content (~7 MB, 47 media files).

## T2 - Regression tests for content after raw-HTML titles

`f56c6c3` added a bullets-after-shrunk-title test only. Add failing-first tests for:
- image line after shrunk title → HTML output contains `<img` (the exact Schwabe shape)
- `Source:` footer after image after shrunk title → `<footer>` element present
- photo-3-up: 3 images must stay ONE paragraph (nth-of-type positioning breaks if a blank
  line ever separates them - guard the invariant)
- end-to-end: renderHtml of a long-title photo slide asserts `<img` and no literal `![]`

## T3 - Autoshrink is too aggressive (fidelity deviation from Keynote)

Evidence: "Clicks doubled after the title rewrite" (38 chars) is shrunk to 84pt although a
single 112pt line fits the photo-horizontal title box. Keynote shrinks only on REAL overflow.
Cause: AVG_GLYPH_EM=0.56 overestimates Helvetica Neue line width → line count → height.
Fix direction: real per-character width table for Helvetica Neue (or measure via the existing
Chrome render step), and never shrink when one line fits the box height and measured width.
Acceptance: the 38-char headline stays 112pt; genuinely overflowing German compound-word
headlines still shrink; pixel-harness comparison against real Keynote autoshrink.

## T4 - Markdown tables are silently mangled

Pipe-table lines (`| a | b |`) are not parsed; each row becomes a fake level-0 bullet.
Silent corruption violates fail-fast. Two steps:
1. NOW: `parseDeck`/`validate` rejects table syntax with a clear error ("tables not
   supported - pre-render as image or use compare layout").
2. LATER: real table support (HTML table styled to Keynote defaults, pptx addTable,
  Keynote AppleScript `add chart/table`) - own design needed.

## T5 - Systemic: raw-HTML emission needs a structural guard

The emitter mixes raw HTML blocks (`<h1>`, `<div class="cols">`, `<footer>`) into a
newline-joined markdown stream; each new raw-HTML emission risks the same swallowing bug.
Refactor: a `pushBlock()` helper that always blank-line-separates blocks (keeping
consecutive images inside one block), plus a property test: re-parse `toMarpMarkdown`
output with markdown-it and assert the expected element counts (imgs, lis, footers).

## T6 - CLI/CI verification for image embedding

Add an integration test that builds a photo slide to PDF and asserts embedded image count
> 0 (pdf-lib or `/Subtype /Image` scan), so a broken HTML→PDF image path can never ship
silently again.
