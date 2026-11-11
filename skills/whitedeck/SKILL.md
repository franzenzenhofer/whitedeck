---
name: whitedeck
description: Use when creating presentations or slide decks that should look like native Apple Keynote (its standard white theme), when the user asks for keynote-style slides, mentions whitedeck, or needs a deck delivered as .pptx, .key, PDF, or HTML from markdown or text content.
---

# whitedeck

Turns markdown into presentations pixel-identical to Apple Keynote's White theme.
NEVER hand-roll slide geometry (pptxgenjs, python-pptx, raw CSS) for Keynote-style decks -
hand-rolled decks get generic PowerPoint dimensions and fonts. whitedeck ships Apple's exact
layout geometry (extracted from Keynote itself) in every format.

## The Editor

Write every deck as **Marta Klar**, a merciless slide editor: half McKinsey storyliner, half
Keynote minimalist. A deck is a sequence of proven claims - every slide one idea, every number
one click from its source. If a slide needs to be read twice, it becomes two slides or gets
deleted. Final test: reading only the headlines top to bottom tells WHAT we look at, step by
step; reading the conclusion lines under them tells the story.

## HEADLINE = WHAT WE LOOK AT, CONCLUSION BELOW IT (Franz, 11 Nov 2026 - overrides any older rule)

Franz: "the headline is never for findings. The headline is always for what we are looking at ...
the finding should be a sub-headline ... never the fucking headline." / "currently you use the
headline for conclusion, which is wrong". Every data / analysis slide has this fixed anatomy,
always at the same positions:

1. **Headline = descriptive, what is shown** - e.g. `Google Analytics: organic traffic, 28 days`,
   `Search Console: /Suche/de/ clicks, 16 months`. Say exactly WHICH data (property, path such as
   `/Suche/de/`, metric, segment). Never a finding, never a verb like "fell".
2. **Right of the headline: tags** - the time window and comparison as pills: `28 days`,
   `16 months`, `YoY`, `28 days YoY`, `1 Jun - 9 Nov 2026`. Always the same place.
3. **Right of the tags: source logos** - the tool the data comes from, as logo + name: Google
   Search Console, Google Analytics, Google Search, Google Discover, Google News, AI Overviews,
   CrUX / PageSpeed Insights ... Logo logic exactly as in the Bergwelten / Speedweek decks
   (one official logo per source, never a text-only label when a logo exists).
4. **Optional context line** (small, under the headline row): date from-to, what is compared to
   what ("Oct 2026 vs Oct 2025, same weekdays"), the traffic-loss frame if needed.
5. **Conclusion line under the headline, always** - the finding in one sentence, e.g.
   "40 % of sessions (1.2M of 3.0M) came from Google organic". This is where the assertion goes.
6. Then the evidence (chart / table / screenshot) and the source line.

**Build every data / analysis slide with the `data` layout** (section "Data slides" below): it
paints exactly this anatomy, and every text on it - headline, tags, logo labels, context,
conclusion, table cells, source - is a native text object in .key, .pptx, PDF and HTML, so the
deck owner can edit it in Keynote. Never bake the headline, tags, logos or conclusion into the
chart PNG: the PNG carries only the plot and its legend.

Also: every % with its absolute numbers and every absolute with its % (both ways); ranges
written out with units ("13 % to 16 %", never "13-16"); a year-over-year comparison is LABELLED
as one (tag `YoY` + context line saying what vs what) and shown with both absolute and share
(e.g. two pie charts + the table); legends draw the real glyph (the band / hatch / line as it
looks in the chart), never only a word like "violet hatched band".

## Editorial rules

1. Headline = what is shown (see the section above); the assertion is the conclusion line under it, a full sentence ("8 of 8 URLs return 404"). Only title / section-divider slides may skip the conclusion line.
2. One idea per slide. A second idea means a second slide.
3. Max 5 bullets per slide, max ~8 words per bullet. No walls of text - nobody reads them.
4. Every bullet must prove the headline; delete anything that doesn't.
5. Every chart, plot, screenshot gets ITS OWN slide with its own descriptive headline + conclusion line.
6. Comparisons (before/after, A vs B) use the `compare` layout - parallel wording, same order.
7. Every URL is a markdown link `[text](url)` - rendered blue and underlined, never a bare URL.
8. Every image/chart links to its data source (GSC chart → GSC report URL; screenshot → captured page) via a source note.
9. Cite evidence with `Source: [Name](url)` as the last line of a slide - rendered small at the bottom.
10. Conclusion lines read in order must form a complete argument; headlines read in order show the path through the data.
11. White space is a feature. If a slide fails the 3-second glance test, split it.

## Commands

```bash
npm install -g --allow-remote=all https://github.com/franzenzenhofer/whitedeck/archive/refs/heads/main.tar.gz   # once, Node >= 20
whitedeck build deck.md -f pptx           # editable PowerPoint, works everywhere
whitedeck build deck.md -f all -o out/    # every format this machine can build
whitedeck build deck.md -f all --name q3  # override the derived file name
whitedeck layouts                         # list layouts
whitedeck validate deck.md                # JSON report, exit 1 on errors
```

Same commands on macOS, Linux and Windows (PowerShell or cmd). What each format needs:

| format | needs | macOS | Linux | Windows |
|---|---|---|---|---|
| `pptx` | nothing (no PowerPoint) | yes | yes | yes |
| `html` | nothing | yes | yes | yes |
| `pdf` | Chrome, Chromium or Edge | yes | yes | yes (Edge is preinstalled) |
| `key` | Keynote.app | yes | no | no |

- `-f all` builds what the machine can and prints one `skipped <format>: <reason>. Fix: ...`
  line per missing format on stderr, exit 0. Linux/Windows: html + pdf + pptx.
- A format named explicitly (`-f key`, `-f pdf`) that cannot be built fails: exit 1, one line
  with reason and fix, nothing written. Never ask for `key` off a Mac - hand over the `.pptx`.
- No browser found: install Chrome or Edge, or `npx playwright install chromium`, or set
  `CHROME_PATH` to the executable.

**Output file names come from the deck, not the input file.** The front-matter `title` (or the
first headline) is slugified: `title: Q3 Revenue Review` → `q3-revenue-review.pptx|pdf|html|key`.
So always give the deck a real `title:` - it is what the client sees in their downloads folder.
Never hand over a file called `deck.key`. Use `--name <base>` only when the file must match an
external convention (ticket id, client naming scheme); a deck without any title fails the build.

MCP alternative: `claude mcp add whitedeck -- whitedeck-mcp`
(tools: `whitedeck_build`, `whitedeck_layouts`, `whitedeck_validate`). `whitedeck_build` follows
the same rules and returns `built` and `skipped` (format, reason, fix).

## Deck markdown

Slides separated by `---`; layout via directive comment. Front matter: title/author.

**Blank lines are load-bearing.** Put one empty line after the `<!-- _class: ... -->`
comment and one after the `#` headline, exactly as below. Without them the bullets or the
image are swallowed into the headline's HTML block and the slide renders empty - and
`whitedeck validate` still reports `ok: true`, so nothing warns you.

```markdown
<!-- _class: title -->

# Migration cut crawl errors by 92%

## SEO report, August 2026

---

<!-- _class: title-bullets -->

# 404s dropped from 1,240 to 96 in 14 days

- Fixed via [redirect map](https://example.com/redirects)
- Zero ranking loss in [GSC](https://search.google.com/search-console)

Source: [GSC Coverage report](https://search.google.com/search-console)

---

<!-- _class: compare -->

# New template loads 3x faster than old

- **Before**
- LCP 4.1s
- 2.3 MB JS
- **After**
- LCP 1.3s
- 0.6 MB JS

---

<!-- _class: photo-horizontal -->

# Clicks doubled after the title rewrite

![](charts/gsc-clicks.png)

Source: [GSC Performance](https://search.google.com/search-console/performance)

---

<!-- _class: quote -->

> "Assertion headlines improve audience recall by ~30%"
> -- Alley & Neeley, Penn State
```

Layouts: `title` `title-center` `title-top` `title-bullets` `bullets` `title-bullets-photo`
`photo` `photo-horizontal` `photo-vertical` `photo-3-up` `quote` `blank` `compare` `data`
plus the left-aligned and annotated-screenshot layouts below.

## Data slides (`data` layout) - the anatomy as native, editable objects

```markdown
# Google Analytics: sessions by channel
Tags: 28 days | YoY
Logos: ga4 | search
Context: 13 Oct - 9 Nov 2026 vs 14 Oct - 10 Nov 2025, same weekdays
Conclusion: Organic share 14.15 % -> 13.85 % (-0.30 pp): 12,614,687 -> 11,145,246 sessions
Notes: what to say on this slide (presenter notes; one paragraph per Notes: line)

![](charts/channels-yoy.png)

| channel | 2025 | 2026 | change |
| --- | ---: | ---: | ---: |
| Organic search | 12,614,687 | 11,145,246 | -11.6 % |

Source: [GA4 Explore export, 10 Nov 2026](https://analytics.google.com/)
```

A slide with any of `Tags:` / `Logos:` / `Context:` / `Conclusion:` or a table becomes a
`data` slide by itself (or write `<!-- _class: data -->`). Fixed positions on every data slide:

| element | markdown | in .key / .pptx |
|---|---|---|
| headline (what is shown) | `# ...` | text box, 56pt, shrinks on one line to 40pt, then 2 lines |
| tags (time window, YoY) | `Tags: 28 days \| YoY` | rounded shape WITH editable text, right of the headline |
| source logos | `Logos: gsc \| search \| path/x.png "Label"` | picture + label as text box (icons) |
| context line (optional) | `Context: ...` | small grey text box under the headline row |
| conclusion (required) | `Conclusion: ...` | text box under the context line |
| evidence | 1-3 `![](chart.png)` side by side, a `\| table \|`, images over a table, OR max 5 bullets | pictures / native table / text |
| source line | `Source: [..](url)` | text box at the bottom, the chart links to its first URL |
| presenter notes | `Notes: ...` (any layout) | Keynote presenter notes |

Built-in logos (`Logos:` ids): `ga4` (Google Analytics wordmark), `gsc` (Search Console wordmark),
`search`, `discover`, `news`, `ai-overviews`, `ai-mode`, `ads` (icons, labelled "Google Search" ...),
`psi` (PageSpeed Insights wordmark). Any image path works too; `"Label"` after an item sets
or overrides its text label. Provenance and licences: `assets/logos/SOURCE.md`.

Fails at parse time (never in front of a client): a data slide without `# headline` or
`Conclusion:`, a `##` subtitle on it, bullets next to images, more than 3 images, the data fields
on another layout, an unknown logo id, a ragged table row, a headline the tags leave < 760pt,
text that does not fit its box at the minimum size. `whitedeck validate` additionally
**warns** on a finding verb ("fell", "rose", "lost" ...) or a % in a data headline and
**errors** on a conclusion with a % but no absolute number, or a compact range ("13-16 %").

Tables: GFM pipe tables, every row starting with `|`; `:--` / `--:` / `:-:` align;
inline `**bold**` and links work in cells; cells never wrap - a cell that does not fit at 16pt
is a build error. Only on the `data` layout.

## Annotated screenshot layouts (scope-*) and left-aligned layouts

For evidence decks - a screenshot per slide with a header telling WHICH page it
is about, a tool logo, a coloured highlight box and a link to the tool result.

- Front matter `logo: assets/logo.png` paints that image bottom-right on EVERY slide.
- `Scope: Detail Page ([url](url))` - header line of a scope slide (`SCOPE:` is added, bold).
- `Tool: assets/psi-logo.jpg` - tool logo, right-aligned in the header.
- `Caption: [https://pagespeed.web.dev/...](https://pagespeed.web.dev/...)` - small grey line at the bottom.
- `Footer: f19n / 27.05.2024` - free footer line (title-left).
- Image attributes live in the alt text: `![border=red](shot.png)`, `![label="JS on" border=red](a.png)`.
  Border colours: `red` `green` `blue` `black` or `#rrggbb`. Consecutive images with the same
  label share ONE label bar.
- Inline runs everywhere: `**bold**` (real bold in pptx and Keynote too), `[green]{#1db100}`
  colours a run, `[label](url)` links.
- Notes column (`scope-compare`, `scope-shot-notes`): bullets grouped under bold headings,
  same syntax as `compare`: `- **IS (not ok)**` then plain bullets, `- **SHOULD**` then bullets.

| layout | content |
|---|---|
| `title-left` | `#` title 91pt, `##` link line, `Footer:` line, all left-aligned at the 54pt margin |
| `section-left` | `#` title 116pt + `##` link line |
| `title-bullets-left` | Keynote Title & Bullets typography, left-aligned, bold/colour runs |
| `scope-shot` | header + `#` title + ONE bordered screenshot centred + `Caption:` |
| `scope-compare` | header + title + 2-3 labelled screenshot columns + notes column |
| `scope-shot-notes` | header + title + big screenshot (1st) + small side screenshot (2nd) + notes + caption |

```markdown
<!-- _class: scope-compare -->

Scope: Detail Page ([https://x.example/a](https://x.example/a))

Tool: assets/chrome-logo.png

# "JS turned off" Test

![label="JS on" border=red](shots/js-on.png)
![label="JS on"](shots/js-on-after.png)
![label="JS off"](shots/js-off.png)

- **IS (not ok)**
- cookie banner initially displayed
- **SHOULD**
- display cookie banner after minimal user interaction
```

`whitedeck validate` fails loudly when a scope slide has no `Scope:` line, the wrong image count
(`scope-shot` 1, `scope-shot-notes` 2) or a `scope-compare` image without `label=`.
Screenshots link to the caption URL (or the scope URL) in every format. A deck using these layouts
or a `logo:` reaches `.key` through Keynote's own PowerPoint import, so links stay blue and
underlined and bars/borders are native shapes (plain Keynote-layout decks keep the master-slide path).

**Subtitles (`##`) only work where the layout has a body placeholder:** `title`,
`title-bullets`, `photo-*`. On `title-center` a `##` has nowhere to go and renders as ~4pt
text in the top-left corner - put everything in the `#` headline instead. Use `title-center`
for section dividers with one line of text.

## Rules of the tool

- Titles get Helvetica Neue Medium 112pt automatically - never restyle output files.
- Image paths resolve relative to the markdown file.
- No fenced code blocks (```` ``` ```` / `~~~`) or `###` headings: they fail validate and
  build, because Keynote White has no style for them. Show code as a screenshot image or inline
  `code`, a sub-heading as a **bold** bullet. Tables only on the `data` layout (native table).
- `<!-- comments -->` never reach a slide. Directives must be a line of their own.
- `-f key` needs macOS + Keynote (runs in background, quits after). Elsewhere use pptx.
  `WHITEDECK_KEYNOTE=off` switches Keynote off on a Mac where someone works (Keynote opens
  windows and error sheets while it imports): `-f key` then fails with that reason, `-f all`
  skips it, and the Keynote tests skip. Build the .key on the build Mac instead.
- Paths may contain spaces and backslashes; quote them in the shell (`"C:\My Decks\deck.md"`).

## Best practice: the IS / SHOULD / WHY audit deck

Franz's preferred shape for any onpage audit (titles, meta descriptions, markup, headings).
**Report, do not interpret.** Three slides per URL, `title-bullets-left` throughout:

```markdown
<!-- _class: title-bullets-left -->

# IS: Hiking Trail Page

- [https://www.example.com/trails/coast-path](https://www.example.com/trails/coast-path)
- <title>Coast Path: Stages, Elevation & More Info</title>
- <meta name="description" content="Dreaming of a trip to the land of the rising sun? ..."/>

---

<!-- _class: title-bullets-left -->

# SHOULD: Hiking Trail Page

- [https://www.example.com/trails/coast-path](https://www.example.com/trails/coast-path)
- <title>Coast Path: 540 km, 26 Stages, 29,232 m Elevation - Example Tours</title>
- <meta name="description" content="540 km, 26 stages and 29,232 m of elevation along the coast: ..."/>

---

<!-- _class: title-bullets-left -->

# WHY: Hiking Trail Page

- "Land of the rising sun" is Japan. The page is a trail somewhere else
- Google: ["Make sure your descriptions are truly descriptive."](https://developers.google.com/search/docs/appearance/snippet#:~:text=Make%20sure%20your%20descriptions%20are%20truly%20descriptive.)
- Franz V3.5: SEO Title = targeted phrase + click through trigger (**numbers**) + brand
- All three numbers are printed on that page: "Length: 540 km, Elevation: 29,232 m"
```

Hard rules of this deck type:

1. **The element, whole, never a paraphrase.** `<title>...</title>` and
   `<meta name="description" content="..."/>` complete, verbatim, opening and closing tag
   included. Never "boilerplate title", never "add a number here", never a half tag.
   Machine-check the IS strings against the captured JSON before building.
2. **URL first, as a clickable link**, on both the IS and the SHOULD slide - the same URL,
   so the two slides are provably about one page.
3. **Headline is the state**: `IS: <page type>` / `SHOULD: <page type>` / `WHY: <page type>`.
   This is the one deck type where the headline is a label, not an assertion - the assertion
   is the markup itself.
4. **SHOULD is a finished string a developer can paste**, built only from values printed on
   that page. No placeholders.
5. **WHY carries the citations**: the Google sentence as a `#:~:text=` deep link plus the
   Franz checklist rule, and one line naming where the SHOULD's numbers come from.
6. **IS equals SHOULD → paint it green** in *both* slides, with the reason spelled out:
   `- [<title>...</title>]{#1db100} **- identical in IS and SHOULD, nothing to change**`
   and announce the code once on the title slide: `[Green = IS and SHOULD are identical]{#1db100}`.
7. Evidence screenshots (live SERP, tool output) go at the end on `photo-horizontal`, not
   mixed into the IS/SHOULD run.

Two things that bite:

- **Literal HTML tags render fine** in bullets - `<title>Foo</title>` comes out as text in
  html, pdf, pptx and key. No backticks needed (backticks are stripped), no entity escaping.
- **Percent-encode `(` and `)` inside a link URL** (`%28`, `%29`). A raw `)` in a
  `#:~:text=` fragment ends the markdown link early: the URL is truncated and a stray `)`
  is printed. Always re-open a text-fragment link in Chrome and confirm it scrolls.
