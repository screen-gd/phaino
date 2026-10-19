# Bring it to light

The section immediately after the hero compares a closed preset surface with an open Phaino workflow. It retains `#workflows` for the existing navigation.

`BringToLight.astro` owns the markup and responsive styling. `bring-to-light.ts` owns state changes, the angle preview, and the one-time graph reveal. The hero still uses `Workflow.astro`; the old live picker, its second workflow instance, styles and script hooks are removed.

- The native radio group defaults to Closed studio and provides browser keyboard behavior.
- Phaino reveals five nodes and four edges over 900ms. The sequence runs once per page visit. Reduced motion or the site's Motion off setting shows the final state immediately, including when changed during a reveal.
- The labelled 30–180° range starts at 90°. Its output, readout, rotation and pan update together. The preview is explicitly illustrative; it does not render a video.
- The closed Generate button only reveals an example result. Its status message states that no render ran or credits were charged.
- Action chips are hidden from both layout and keyboard navigation in the closed state. They currently point to the presets section and GitHub.
- Below 900px, the graph stacks under the 16:9 shot as a vertical chain. The three facts retain their three-column strip.
- The section uses Archivo and IBM Plex Mono, black surfaces and the existing orange accent. The rest of the page keeps its typography.

## Skill and component selection

Fleet retired `gpt-taste` and records `design-taste-frontend` as its approved replacement. The user's specified composition and copy take priority over its generic section and eyebrow defaults. `motion-design` supplies the one-time, reduced-motion-safe choreography.

Col was queried through its configured `https://usecol.com/api/mcp` endpoint using the permitted direct-service fallback because Executor was unavailable. Searches covered radio groups and sliders. The matching [Radix Radio Group](https://www.radix-ui.com/primitives/docs/components/radio-group) and [Slider](https://www.radix-ui.com/primitives/docs/components/slider) are React primitives. This Astro section uses native controls without introducing a React runtime. Its existing GSAP/Lenis page integration remains in place.

## Validation

The Astro check and production build pass. A Happy DOM interaction check, run outside the repository without changing project dependencies, covers default and toggled visibility, angle endpoints and transforms, action links, the 900ms reveal, one-time animation behavior, reduced motion, user pause, and keeping the hero's original graph isolated. No browser testing was performed.
