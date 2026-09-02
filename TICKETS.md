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

## T0 - PROCESS root cause: why our development process did not catch this

The bug shipped through gates that were "typecheck + lint + 36 green integration tests +
pixel comparison + skill TDD". Process 7 Whys:

1. Why did no test fail? The autoshrink test asserted the intermediate markdown string
   (`<h1 style=...>` present), not the rendered artifact - it tested our imagination of
   what markdown-it would do, not what it does.
2. Why did the HTML integration test pass? Its fixture title ("Hello Keynote") was toy
   content that never triggered shrink - the branch that breaks was never exercised
   end-to-end.
3. Why did the e2e CLI test pass? examples/demo.md's photo title ("The ocean") is short;
   real decks have long German headlines. Fixtures were not representative and never sat
   on both sides of the shrink threshold.
4. Why didn't the pixel harness catch it? It would have (literal `![]` is visible) - but
   it was a manual one-off, run BEFORE autoshrink existed and never again. It was
   protection that existed only in memory.
5. Why did the features interact unsafely? Shrink (raw-HTML emission) and images (markdown
   emission) were each tested alone; no fixture combined them on one slide. Bugs live in
   feature interactions, and we had zero interaction coverage.
6. Why was the emitter fragile at all? Raw HTML was pushed into the markdown stream ad hoc
   in three places with no shared structural guard, so every new emission re-rolled the
   dice on CommonMark block rules.
7. Why did "verification before completion" not save us? The final visual verification
   after autoshrink was done on the compare slide - which has no image. We verified A
   change, not THE affected journey.

Root cause of the process failure: **we tested intermediates with unrepresentative
fixtures, never re-ran the artifact-level verification after the last change, and had no
invariant connecting deck input to rendered output.**

Remedy: DEVELOPMENT-PRINCIPLES.md (P1-P10), now binding via CLAUDE.md. Enforcement work
items are T2 (interaction regression tests), T5 (structural emitter guard + property test),
T6 (payload invariants in CI), plus: promote the pixel harness to `npm run verify:visual`
(P6) and add a kitchen-sink fixture deck built to all formats in the suite (P4).

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

---

# Tickets 2026-08-31 (Schwabe per-question decks - photo layout geometry)

Found while building 25 per-question decks from the same Schwabe source. Four defects, all
in the picture path, all fixed in `src/render/css.ts` + `src/render/pptx.ts` (NOT yet
committed at the time of writing). Tickets below cover the root fix, the regression tests
that must exist, and the prompt/skill changes so decks are authored correctly in the first
place.

## T7 - DONE (needs tests): photo frames overlapped the title and cropped content

Symptom: on `photo-horizontal`, a GSC screenshot (1.60:1) covered the headline; every chart
lost its own axis title and left-hand labels.

Root cause, measured from `src/theme/white.json`:
- the `pic` placeholder starts at `yPx: -41` (above the canvas) and is `1269px` high, so it
  reaches `y=1228` while the `title` placeholder starts at `y=999` - the Keynote frame
  overlaps the text zone by 229px by design (a photo is meant to bleed behind the caption).
- `picRules` rendered images with `object-fit: cover`, which crops whatever does not match
  the frame ratio. For a photo that is the Keynote look; for a chart it silently destroys
  data (axis titles, tick labels).

Fix applied:
1. `object-fit: contain` + `object-position: center center` - never crop chart content.
2. `picFrame()` clamps the frame top to the canvas (`yPx >= 0`) and its bottom to
   `min(title.yPx, body.yPx) - 24px`, so a contained image can never overlap text.

Missing: tests. Add
- a CSS unit test asserting `object-fit: contain` and a clamped, non-overlapping box for
  every layout that has a `pic` placeholder;
- a rendered-artifact test (photo-horizontal + tall image + long title) that asserts the
  image bottom sits above the title top.

## T8 - DONE (needs tests): photo frames wasted up to 34% of the slide

Symptom (Franz, verbatim): "warum kleven die charts so weit oben? warum wird so viel platz
verschwendet?"

Root cause: the `pic` frame is `1904px` wide on a `2560px` canvas (74%), while the text
column is `2427px` (95%). Charts are wide - measured over the 47 Schwabe assets: ratios 1.54
to 3.95, median ~2.4. A contained wide image is width-limited, so it shrank to as little as
482px height inside a 975px band: **493px, i.e. 34% of the slide, empty** between chart and
headline.

Fix applied: `picFrame()` widens the frame to the layout's widest title/body placeholder
when that is wider than the `pic` frame (contained images only ever shrink to fit, so this
cannot crop), and centres vertically in the remaining band. Effect on the Schwabe assets:
+27% linear size for every chart wider than the frame ratio, empty band roughly halved.

Regression caught during verification (and fixed): the first version widened/clamped EVERY
pic placeholder. That breaks the side-by-side layouts - `title-bullets-photo` (pic x1151
w1464, bullets x177 w1073, same vertical band) had the image widened to the 2205px title
column, straight over the bullets; `photo-vertical` (pic beside the text) had its frame cut
from 1204px to 561px height. Rule now: the bottom clamp only considers text that
HORIZONTALLY overlaps the picture, and widening only happens when NO text shares the
picture's vertical band. Verified per layout in the generated CSS: photo-horizontal widened
(67/2427/975), title-bullets-photo, photo-vertical, photo-3-up and photo untouched. This
per-layout assertion is exactly what the missing test must encode.

Open question for the root fix: this deviates from "pixel-exact Keynote White". Proposal -
keep Keynote geometry for `photo`/`photo-vertical`/`photo-3-up` (real photography) and use
the content-column geometry for `photo-horizontal` (the layout decks actually use for
charts and screenshots), or expose it as a documented `--fit` flag. Decide, then encode in
`white.json` rather than in the renderer.

## T9 - DONE (needs tests): PPTX stretched every image out of aspect ratio

Symptom: found only by reading the generated slide XML - the PDF/HTML path looked fine.

Root cause: `addImages` passed the placeholder rect plus `sizing: {type:'contain'}` to
pptxgenjs, which wrote `<a:ext cx cy>` equal to the FULL frame. Example: `gsc-performance-16m.png`
(1.60:1) written into a 1.95:1 frame - a 22% horizontal stretch, shipped in every .pptx and
.key we ever produced.

Fix applied: read the PNG intrinsic size from the IHDR chunk, compute the contained rect in
EMU ourselves, centre it, and write exact `x/y/w/h` without `sizing`. Verified on the
Schwabe deck: 47/47 pictures, aspect deviation 0.00%, none overlapping the title.

Missing: tests, and non-PNG support. Add
- a pptx test that builds a photo slide from a known-size image and asserts
  `cx/cy == intrinsic ratio` within 1%;
- JPEG (SOF marker) and SVG (viewBox) intrinsic sizing, or an explicit fail-fast when the
  size cannot be determined instead of silently falling back to the frame.

## T10 - PROMPT/SKILL: the blank line after `<!-- _class: ... -->` is load-bearing

Symptom: the 186-slide Schwabe master deck rendered with bullets squeezed into a 4pt strip
in the header and empty slide bodies - on EVERY `title-bullets` slide. Cause: the deck was
authored as

    <!-- _class: title-bullets -->
    # Headline
    - bullet

with no blank lines. `examples/demo.md` has them; nothing enforces or documents it, and
`whitedeck validate` reported `ok: true` for the broken deck.

This is the same class of bug as the 2026-08-24 one: CommonMark block boundaries decided by
whitespace we do not control. Three actions:
1. ROOT: normalise in the parser - treat a `_class` comment, a heading and the block after
   it as separate blocks regardless of blank lines. Whitespace must not change semantics.
2. GUARD: `whitedeck validate` must FAIL (not warn) when a slide's parsed body is empty
   while its raw source contains list or image lines. `ok: true` on a deck that renders
   blank is the worst possible failure mode.
3. PROMPT: `skills/whitedeck/SKILL.md` must state the rule explicitly and every example in
   it must show the blank lines. Until action 1 lands, this is what stops AI-authored decks
   from silently rendering empty.

## T11 - PROMPT/SKILL: `title-center` has no body placeholder

`## Subtitle` on a `title-center` slide has no placeholder to land in and renders as ~4pt
text in the top-left corner. Every `Big Topic N` divider of the Schwabe deck looked broken.
Actions: `validate` should reject `##` on layouts without a `body` placeholder (fail fast,
name the layout), and SKILL.md should document which layouts accept a subtitle.

## T12 - Verification gap: none of T7-T11 was caught by tests or by validate

All five defects were found by rendering pages to PNG and looking at them, and by reading
the PPTX XML. `npm test` (45 green), `typecheck`, `lint` and `whitedeck validate` all passed
on every broken artifact. Per DEVELOPMENT-PRINCIPLES P6, add `npm run verify:visual`: build
a kitchen-sink deck (every layout, a wide chart, a tall screenshot, a long German headline)
to PDF and PPTX and assert geometric invariants - image inside its frame, image not
overlapping text, aspect ratio preserved, body text present where the source has bullets.
