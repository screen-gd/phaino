# Cutaway landing page

Design uses Fleet's installed design-taste-frontend (approved as the replacement for gpt-taste), motion-design, motion-catalogue, and TypeScript preferences.

## Direction

On this page, Cutaway's open workflow becomes a literal cut through the finished frame. The same separated frame appears in the logo, reveal, preset cards and closing wordmark. The Taste draw selected `one-motif`; the brief overrides its default section layouts, mono ban and square corners. No product screenshots or testimonials are invented.

Archivo's compact grotesk is paired with IBM Plex Mono for actual technical metadata. Tally orange (#ff5b22), the light a camera shows while it records, marks actions, live signal on node wires and the record dot, against true black with untinted greys. It replaced an earlier lime that sat too close to Higgsfield's own accent. Media keeps a desaturated grade so the accent stays the only saturated colour in the UI. Motion is Premium: power3.out, 140 / 400 / 800ms; no bounce. Scroll movement expresses the opening workflow, and other elements move quietly behind it.

## Argument and copy deck

1. Every frame. Wide open. / An open-source AI studio for images and video, built on ComfyUI. Every preset is a workflow. Make it yours. / Star on GitHub. Try a preset.
2. Every preset is a workflow you can open. / Start with the shot. Get all the nodes. Inspect, tweak, fork, repeat. / Interactive workflow anatomy, explicitly an example.
3. From first idea to final frame. / Image: FLUX, style presets, consistent characters. Video: LTX 2.5, text or image to video. Moves: cinematic camera paths. Effects: extension, match cut, morph, explode, melt. Avatars: photo + voice, talking shot. Edit: inpaint, outpaint, relight, upscale.
4. Direct the camera. / Seven named camera presets with workflow access, preview slots, and adjustable motion in the example graph.
5. Keep the shot. Change the rest. / Keyboard-operable before / after scrubber demonstrating a placeholder grade.
6. Make a move. Pass it on. / Open, make it yours, publish. Placeholder community entries have attributed example handles and fork counts.
7. Your machine. Your rules. / Local GPU or Comfy Cloud. No Cutaway credits, no watermark. MIT software; cloud compute is metered separately and model licenses apply.
8. It belongs on your timeline. / FPS, resolution, handles, FCPXML / EDL, shown with a scrub-linked NLE strip.
9. Built for Comfy's Open Source Higgsfield challenge. / Small credit only.
10. Open the studio. / GitHub and X. Studio remains under development, so this opens the repository rather than pretending a generation service exists.

## Col research

Connected to https://usecol.com/api/mcp using Streamable HTTP. Executor is not exposed in this session, so used the allowed direct-service fallback. The checked-in .mcp.json enables the connection in compatible clients.

- search_libraries: smooth scroll, GSAP, node graph, litegraph.
- search_components: text reveal, media reveal, marquee, magnetic, grain.
- get_library: lenis, gsap; get_component: magic-ui/Marquee.
- Selected Lenis for smooth scroll, and GSAP / ScrollTrigger for pinning, transforms, text/media reveals, magnetic feedback and the infinite marquee. These work directly with Astro without a React runtime.
- Col's magnetic, noise, text and marquee components are React-based. GSAP implements their underlying patterns within the selected stack; static grain avoids a continuous canvas noise renderer.
- Col returned no recorded node-graph library. Use Comfy's own @comfyorg/litegraph for the on-demand editable graph. The inline graph remains semantic HTML with SVG connections for a small, accessible initial payload. The graph is workflow anatomy, not a claim that a production Comfy pipeline exists in this repository.

## Media handoff

Photography is illustrative poster material, not generated output. See public/media/README.md for sources, replacement paths and encoding guidance. Video slots activate at build time only when the matching file exists. Missing footage uses its poster without broken requests. Community handles and counts are sample data.

## Review and verification

Reviewed the actual 1440px, 768px and 390px renders using the installed Taste workflow. Expanded the bento proportions, replaced the single gallery row with staggered masonry columns, enlarged mobile running copy and node labels, removed the decorative footer slogan, fixed footer contrast, and gave the exposed hero graph a longer hold. Corner masks animate using transforms, and connections light using opacity. The photo scrims are neutral legibility treatments.

The stock Taste lint intentionally flags the brief's requested mono timecodes, node outlines, graph grid, timeline ruler, rounded bento, horizontal swipe gallery and film metadata. These are literal controls and technical diagrams from the brief, not exceptions inferred by the implementation. No footage exists yet, so its no-footage warning remains an honest media handoff. The inspector's programmatic scroll plus tiny wheel event repeatedly resets Lenis's target; verified the full scroll narrative separately with real wheel input through the same skill's CDP helper. Hero pin releases after its intended section, and the horizontal camera gallery releases before Edit.

Build and Astro/TypeScript check pass with zero diagnostics. Production npm audit reports zero vulnerabilities. Lighthouse desktop on the production build measured 97 performance, 100 accessibility, 100 best practices, 100 SEO (1.3s LCP, zero CLS); reports are local in .review. The on-demand Comfy LiteGraph dependency emits a build warning for upstream eval code and is marked deprecated by npm; it is isolated in the example editor and receives no executable workflow imports.

Verified the five-node editor loads on demand, prompt and duration changes appear in serialized JSON, Escape returns focus, preset filters work, the scrubber updates, the paused page remains horizontally scrollable, and a 390px viewport has no horizontal overflow or broken images. The hero pin, gallery traversal, mobile layout and console were checked in a real browser. Preview tooling sometimes timed out on offscreen click targets; the documented skill browser supplied the remaining visual evidence.

Next: replace photographic posters with original FLUX/LTX loops, replace anatomy examples with runnable and versioned ComfyUI graphs, and connect publishing/fork counts to real community data. These are product/media integrations beyond the landing page.

## Hero revision: centered expansion and scroll performance

Replaced the generic mountain hero with original generated black-sand coastal artwork. The uncompressed source is preserved in assets/hero-coast-original.png; the 1920px WebP is 132 KB. The asset is original landing-page art, not proof of an LTX/FLUX generation pipeline. Mobile source selection accounts for the tall object-fit crop so it does not enlarge a 640px panorama across the whole hero height.

The header remains a 52px sticky bar. The hero starts centered below it with equal gutters on all four edges (23.75px in the measured 1920×1080 viewport; 12px at 390×844). Removed the old 1756px width cap. Both axes expand together from the center to the full stage below the header; there is no upward frame translation or decorative lower strip.

Measured the same 300px wheel input at 1920×1080 before and after. Original: p95 frame interval 104.2ms, settling time 1194ms, 129 frames over 2.4 seconds. Disabling only SVG turbulence reduced p95 to 7.1ms, identifying grain rasterization as the bottleneck. Replaced turbulence with a static 128px raster tile, removed its separate animation, and used the already graded photograph without a live image filter. Removed the additional GSAP scrub delay and shortened Lenis smoothing to 0.6 seconds. Final measured p95 was 7.1ms, settling time 528ms, 347 frames over the same interval. These are local rendering measurements, not a universal device FPS claim. The faster renderer processes more frames, so total main-thread work in the sample increases from 91ms to 200ms despite substantially smoother presentation.

The T3 preview's hidden tab did not advance animation frames during measurement. The installed Taste workflow's headless runner supplied the comparative measurements and the final desktop/mobile geometry. Local evidence lives in .review/hero-before.json, .review/hero-without-grain.json and .review/hero-after.json. Build and type checks pass; the previously documented upstream LiteGraph warning remains.

## Section redesign, October 2026

Kept the hero geometry and choreography; only its colour tokens changed. Everything after it was reworked so neighbouring sections no longer share the heading-left, lede-right layout.

- Workflows is the page's interactive centrepiece. Picking Orbit, Dolly in, Crash zoom or Whip pan rewrites the prompt, motion and output nodes, draws each wire in graph order, lights the nodes, then renders the preset's frame inside the output node.
- Studio bento swaps its one-liner for the full detail on hover or focus.
- Camera moves pin vertically centred. One shared cursor follower replaces the per-card chips. It hit-tests on pointer move and on scroll, so cards sliding under a still pointer update it and no label is left on a card the pointer has left.
- Edit tools switch the comparison between relight, upscale, outpaint and inpaint treatments of the same photograph (CSS, labelled illustrative).
- Community: a fork branch draws off the main line with scroll, above the masonry marquee.
- Run it yourself opens on 0 credits, 0 watermarks, MIT at display size. A Local / Cloud switch rewrites the env line in the terminal and in the copied commands.
- Pro export: the generated clip, now with a thumbnail, is dragged onto V2 as the playhead scrubs.
- Footer: a second CTA for X, and the wordmark rises with scroll.

## Clarity and fit pass, October 2026

Feedback: the page was hard to understand and sections were cut off. The copy was metaphor ("Make a move. Pass it on.") instead of explanation, sections were taller than the window, and the node graph appeared twice in a row.

- Every section after the hero is a `.screen`: one viewport tall, with media heights derived from `svh` so the heading and its content are always visible together. Verified at 1920×1010 and 1440×900 with `.review/sections.mjs`, which checks that each section's heading and last element sit inside the viewport.
- Headlines now say what the feature does: "Every preset is a workflow you can open.", "One studio for images and video.", "Cinematic camera moves.", "Fix a shot without starting over.", "Remix presets. Share your own.", "Free, open source, and runs on your machine.", "Drops straight into your edit."
- The workflow board shows "The preset you click" beside "The workflow behind it" instead of repeating the hero's graph.
- Navigation reads How it works, Features, Camera moves, Community, Run it free.
- Phones keep natural section heights.

## Completion pass, October 2026

- **Preset catalogue** (`#presets`): all 22 presets from the brief, filterable by tool. Availability is read from disk at build time (`src/data/presets.ts`): a preset shows a Workflow download only when `public/workflows/<slug>.json` exists, otherwise "In progress". Nothing ships yet, so every preset honestly reads "In progress".
- **Cost calculator** (`#cost`): electricity per clip and per month from clips, render time, GPU watts and $/kWh, with an optional "your current plan" comparison. All defaults are editable estimates and labelled as such.
- **GitHub stars** in the header button, fetched live and shown only from 25 stars.
- **Share image**: `public/og.jpg` (1200×630) with Open Graph and Twitter card tags. Set an absolute site URL for `og:image` once the domain is known.
- **Footage-ready**: the workflow board plays `public/media/moves/<slug>.mp4` and offers the matching workflow download when those files exist; until then it shows posters.
