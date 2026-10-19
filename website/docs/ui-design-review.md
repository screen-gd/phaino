# UI design review, October 2026

Reviewed against design-taste-frontend (the approved gpt-taste replacement), motion-design and motion-catalogue, using the existing screenshots in `.review/screens` and the source. The direction holds up: the film-frame hero, the open-workflow peel and the node-graph language (now in tally orange, see landing-design.md) are specific to Cutaway. The weaknesses were in execution detail, not in the concept.

Kept as is: the 52px sticky header, the centred hero with four equal gutters and its four-side expansion, the lateral peel, the coastal artwork and its mobile `sizes` and crop, static grain, Lenis at 0.6s with `scrub: true`, and the mono face for real specs.

## Findings, by priority

1. **Display tracking was too tight to read.** H1 at -0.07em and H2 at -0.065em closed the word spaces: "Every frame" read as "Everyframe", and "your timeline" as "yourtimeline". This affected every section heading.
2. **Too much text was below a readable size.** Mono labels ran from 5 to 9px, with 5 to 7px common on phones. Sans notes, links and captions sat at 9 to 11px. The worst cases were the board toolbar at 5px, timeline labels at 6px, terminal text at 8px and the dialog inputs at 12px (which also makes iOS zoom on focus).
3. **The mono labels had become slogans.** "YOUR GPU. YOUR SHOT. YOUR CALL.", "CUTAWAY / OPEN STUDIO", "NOTHING HIDDEN", "SEVEN WAYS TO FIND YOUR SHOT", "REMIXED IN THE OPEN.", "STILLS + VIDEO / SAME OPEN WORKFLOWS", "FLUX FOR STILLS. LTX 2.5 FOR MOTION." and "THE FINISHING PASS" were small uppercase taglines rather than specs. The brief rules out random slogans and keeps mono for real metadata.
4. **The hero corners were crowded.** There were six pieces of chrome around the image: a label, the timecode, a footnote, the chip, a scroll note and "Built on ComfyUI". The fact that mattered most (built on ComfyUI) was the smallest text on screen.
5. **Glass blur inside the scaling hero.** "Try a preset" and "Open the workflow" used `backdrop-filter: blur(12px)` inside the frame that GSAP scales on every scroll frame. That is the same per-frame rasterization cost that caused the earlier lag, and the Taste house rules also exclude glass.
6. **False affordances and dishonest labels.** The Inpaint, Outpaint, Relight and Upscale tags were bordered boxes that looked like buttons but did nothing. "Sort by fresh cuts" actually sorted by fewest forks; the sample data has no dates. "SEVEN WAYS…" stayed at seven after a filter hid cards.
7. **Mobile orphan in the hero.** `.desktop-only` had no CSS, so the hero line break showed on phones and left "video." on a line of its own (see `hero-coast-mobile-final.jpg`).
8. **Inconsistent radii.** Buttons and controls used 5, 7 and 9px. Panels used 14, 16, 18, 20 and 22px. Community cards used 22px while other media used 28px.
9. **Supporting copy was grey.** Section ledes and body copy were set in `--muted`. Taste asks for running text at full ink, and the user prefers white primary text.
10. **Decorative crosshair on every camera card.** It sat on top of the image without adding any information.

## Changes

- **Type.** Display tracking is now -0.048em with +0.04em word spacing (hero -0.052em / +0.05em). Card and move titles were adjusted to match. The mono base is 11px at 0.04em tracking, with a floor of 10px on phones. Sans notes, links, captions, lists and footer text are now 13 to 17px. The dialog text input is 16px.
- **Hero.** Removed the left label, the footnote slogan and the separate scroll note. What remains is the timecode (top right, tabular figures), a sentence-case "Scroll to look under the frame ↓" and the workflow chip. The supporting line now reads "An open-source AI studio for images and video, built on ComfyUI." The expansion, peel and pin timeline is unchanged; only the fade selector was updated.
- **Performance-safe controls.** Removed backdrop blur from `.button-glass` and `.workflow-chip`. They now use solid translucent scrims with a hover state that changes background or border colour only.
- **Slogans replaced with specs or removed.** The board toolbar shows "EXAMPLE GRAPH ● 5 NODES". Removed the board footer pipeline line, "No secrets", the studio note row, "REMIXED IN THE OPEN." and the edit-section tagline. Capability tags are now input/output specs: FLUX, LTX 2.5, CAMERA PATH, VIDEO → VIDEO, PHOTO + VOICE, STILLS + VIDEO. The terminal title is "TERMINAL".
- **Honest affordances.** The edit tools are a plain `<ul>` with node-port dots and no button chrome. The sort control reads "Fewest forks first" / "Most forks first". The moves footer shows a live count (`7 MOVES`, updated by the filters). "Scroll / Swipe to explore" is sentence case, and the label switches back when the viewport crosses the breakpoint again.
- **Mobile.** Defined `.desktop-only` below 800px. Raised the timeline, node, board and terminal text to readable sizes. Below 480px the ruler shows every other timecode. All three workflow values stay visible.
- **Tokens.** Added `--radius-ui` (6px, buttons, filters, chips, tabs, inputs), `--radius-panel` (16px: board, terminal, timeline, dialog) and `--lede` (#cfd3c8) for supporting copy. Media keeps `--radius`, and community cards now use it as well.
- **Navigation.** The desktop nav now follows page order and includes "Run it yourself", matching the mobile menu.
- **Motion.** Section headings now enter heading-first, followed by the lede, with an 80ms stagger, using transform and opacity once per element. The existing reduced-motion and motion-toggle paths cover this. No new ambient or looping effects were added. Filter and header controls get short colour or border transitions.
- Removed the crosshair overlay from the camera cards.

## Files

- `src/styles/global.css`
- `src/pages/index.astro` (markup, copy and the library comment)
- `src/scripts/studio.ts` (hero fade selector, swipe label revert, staggered heading reveal, live move count, honest sort label)
- `docs/landing-design.md` (hero line in the copy deck)

## Validation

`npm run build` (`astro check` + static build): 0 errors, 0 warnings, 0 hints across 8 files. The build succeeds. The only build warning is the documented upstream `eval` in `@comfyorg/litegraph`.

## Limitations

There was no new browser run, per the standing preference. The changes have not been seen rendered, and the earlier Lighthouse and frame-time numbers are not new measurements. Worth checking on the next visual pass:

- The 390px hero bottom row (wrapped scroll hint next to the chip).
- That the mid-width graph (481 to 800px) truncates node values cleanly at 10px.
- That the timeline ruler fits at 390px with three labels.
- A re-run of `.review/hero-benchmark.mjs`. Removing backdrop blur should only lower hero cost, but it has not been measured.
