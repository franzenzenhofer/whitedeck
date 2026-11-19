# Learnings: building large Keynote decks fast and right (bergwelten.com strategy paper, 18 - 19 Nov 2026)

Source project: `~/f19n Dropbox/.../redbull/2026-rbmh-migration-review-strategy-paper/concept-2026-11-18-bergwelten/`
(`dummy-deck/` = the build pipeline, `final-2026-11-19/` = the deliverables). Every number below was measured in that
project on 19 Nov 2026. Read this before building any deck with more than ~20 slides.

## 1. The fast build: pptx -> ONE Keynote import (38 s instead of ~90 min)

| path | how | 289 slides | links |
|---|---|---|---|
| slow (old) | AppleScript drives Keynote: one command per text box, table cell, row height, colour, image | ~66 - 90 min | 0 (Keynote's AppleScript has no hyperlink property) |
| **fast** | python-pptx writes ONE .pptx with every shape at its final position, Keynote opens it once and saves .key + exports PDF | **3 s pptx + ~20 s Keynote** | **real clickable links** (text runs and picture click actions) |

Measured: rc2 slow build 13:40 - 14:57 = 77 min; fast build `build-v10.sh` 38 s end to end (stage + pptx + import + SEO
section + md). Same content, same layout.

How it works (`dummy-deck/pptx_build.py`, `fast-build.applescript`, `build-v10.sh`):
- Keep ONE layout engine. The geometry (positions, column widths, row heights, chart fitting) stays in
  `keynote_script.body()`. For the fast build, its 3 primitives `_text`, `_image`, `_table` (and `_fit`, `_fit_left`) are
  swapped for recorders that return shape ops; python-pptx writes the ops. No second layout code.
- **Only write the ops the layout RETURNS.** `body()` builds candidate boxes in advance (a side box AND a box below) and
  returns one. Recording every call drew the text twice. Fix: each recorder returns a token, write only returned tokens.
- **Units:** 1 Keynote point = 1 pptx point. Slide 1920 x 1080 pt = EMU x 12700 (like whitedeck). Font sizes 1:1.
- **Keynote rejects python-pptx presenter notes**: "file format is invalid" on import. Proven by bisection (one probe
  file per text property: only the notes variant failed, 2 of 2 runs). Do not write notes into the pptx.
- Table look as in the White-theme decks: header fill RGB(0, 77, 128), white bold text; body rows white / RGB(227, 229,
  232) striped; text centred, 28 pt Helvetica Neue; red RGB(217, 48, 37) / green RGB(24, 128, 56) only by meaning.
- Titles: Helvetica Neue Medium 52 pt, centred, box 133..1787 x 40..196, vertical anchor middle (lines centre on y 118).
  Dividers 64 pt centred. Footer source line 28 pt grey at y 1010.
- A slide copied from a master-based deck by `move` loses its master placeholders (title gone) in a pptx-imported deck:
  rebuild such a slide natively instead of moving it in.
- Videos: `shapes.add_movie(..., mime_type="video/mp4")` embeds them; Keynote IGNORES the pptx poster image and shows
  the movie's FIRST frame. For a cover with a play button, make frame 0 (1/30 s) the cover in the mp4 itself
  (`overlay=...:enable='eq(n,0)'`); keep a clean copy without it for publishing.

## 2. Keynote automation: the traps (all hit and fixed on 19 Nov 2026)

- **AppleScript `open` gives the sandboxed Keynote NO file access** for many paths: an invisible modal "can't be opened
  right now: Operation not permitted" blocks Keynote (over ssh it just hangs at 0 % CPU). Fix: open via LaunchServices
  `do shell script "open -a 'Keynote Creator Studio' " & quoted form of p`, then wait until the document is listed BY
  NAME (`file of d` is unreliable over ssh).
- **Cross-deck copy: `duplicate slide x of s to after slide y of d` silently does nothing; `move` works** (and removes
  the slide from the source document in memory: never save the source).
- The app is "Keynote Creator Studio" on disk (Keynote 15.3.1 renamed); `tell application "Keynote"` still works.
- `before` / `after` are reserved words in AppleScript: never use them as variable names.
- Keynote is single-user: never run two builds against the same Keynote (rc1 lost a run to an AppleEvent timeout).
  Wrap long jobs in `with timeout of 3600 seconds`.
- Hidden ("skipped") slides do not appear in the PDF export: a 320-slide deck exported 305 pages.
- Never edit a human's deck: copy it first, work on the copy, record its sha256 before and after.

## 3. Layout learnings from Franz's reviews (rules R1 - R34 in the project's `coord/FRANZ-RULES-PENDING.md`)

- Time series always full width (>= 90 % of the body); the chart may give up 10 % height to keep its text on the slide.
- Text-height model calibrated on the real render: 28 pt line pitch 34 px, gap between bullets 60 px. Too generous a
  model creates needless "(2 of 2)" repeat slides (23 of them in rc1).
- Tables: row = 30 + 36 px per text line; re-pack split tables; put chart + its table on ONE slide when it fits
  ("stack" = chart top + table below, "grid" = chart top-left, text right, table below).
- No screenshots of other slides: copy native slides (`move`) or recreate them natively; check the recreation keeps
  every statement (content test).
- GOLDEN RULE R34: no screenshot without a link, and the screenshot IMAGE ITSELF is clickable (picture click action in
  the pptx; impossible on the slow path).
- Screenshots of web pages: click the consent dialog first (the button may be in the DOM/shadow DOM; click via JS), or
  the screenshot shows the cookie banner instead of the page.
- A cookie-banner / dark overlay over Google's rendered page = the GSC test FAILS (red), never orange.
- Show, do not reference: a to-do that says "check the 20-type checklist" must list the 20 types on the slide.
- Version every output (`-v10`, `-rc2`, timestamped folders); never overwrite a delivered file.

## 4. Learning from Franz's hand edits (19 Nov 2026): build decks the way he finishes them

Method (repeat it after every manual edit session):
1. Record the session (screen + mic + system audio, one command: openrouter-transcribe `record-start.sh`).
2. Export his deck from a COPY to PDF; dump BOTH decks shape by shape with AppleScript (class, x, y, w, h, text,
   size, font, colour, table cells, files): `analysis-franz-edit/dump.applescript` + `convert.py`.
3. Page diff (`dummy-deck/diff_pages.py`: align pages by title / text, visual score 1 - mean abs grey diff at 40 dpi)
   + HTML report (`diff_report.py`); Gemini ("Argos") on the video for the WHEN / WHAT (`video-edits.md`); Codex
   gpt-6.2-sol on before/after contact sheets for the WHY and the rules (`LEARNINGS-FRANZ-HAND-EDITS-2026-11-CODEX.md`).
4. Teach the build (`dummy-deck/build_franz.py` + `build-franz.sh`, one command, 76 s): his order and hidden slides;
   per generated slide his geometry / text / size / colour item by item (Keynote item i == pptx shape i, verified);
   slides he wrote or pasted come from a copy of his deck by `move`.

Result: his deck 320 slides (15 hidden, 305 visible). Baseline (our build vs his): 213 of 305 pages identical, 51 edited,
41 inserted, 9 deleted, mean visual similarity of matched pages 0.9919. Rebuild with the learned edits: **305 of 305 pages
matched, 285 identical, mean 0.9989, worst page 0.9699**; his file untouched (sha256 eb6de042... before and after).

What he does, as rules for the FIRST build (details, page evidence and the why: the Codex file):
- **Decision brief first:** after title + offer, Management Summary (trend chart + diagnosis + causes) and Potential
  (growth estimate with a caveat footnote, a real example such as the video) BEFORE the table of contents. The
  conclusion moves forward; the end carries concrete to-dos with targets.
- **Size evidence for the room:** pies >= 55 % (target 60 - 65 %) of the body height with a >= 28 pt legend; landscape
  screenshots 55 - 65 % of the width, tall ones >= 70 % of the body height; phone captures ~ 21 % of the width each.
- **Text-only slides use the canvas:** 36 - 44 pt for short findings and method slides, >= 32 pt body text,
  1.15 - 1.30 line spacing; put the formula / method first, the client's value next ("4.7 days = GOOD" in green).
- **Every chart / table gets one plain-language reading** under it (period, denominator, benchmark when it changes the
  reading); bold the verdict; red only for measured misses.
- **Merge duplicates:** same metric + period + chart = one slide that keeps every distinct finding; a generic benchmark
  slide goes next to (or into) the client's calculation. He HIDES (skips) slides instead of deleting them.
- **Imported material stays native and complete:** paste whole source chapters (32-slide MUI module) instead of
  recreating them as sparse text; flag any import where a source visual disappears.
- **Average-position charts always carry the caveat** that losing poorly ranked results improves the average.
- Leave to him: the weight of each cause in the diagnosis, forecasts (20 - 30 %), tone of verdicts, which chapters the
  audience needs.

## 5. One command

`bash dummy-deck/build-v10.sh <out-dir>`: gates -> pptx (3 s) -> Keynote import + PDF (~20 s) -> native SEO-test slides
moved in (16 s) -> md with the same page numbers. Keynote runs on whatever Mac has it (this Mac or Arthur).
