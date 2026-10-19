# Social previews

The current image-generated 1200 × 630 JPEGs live in `website/public/social/`:

- `01-veil-v3.jpg`: centered lockup above matte overlapping orange light fields.
- `02-refraction-v3.jpg`: left-aligned wordmark with fine vertical glass texture and diffused orange light. Current default.

Version 3 uses the built-in Image Gen tool with brandkit direction. PNG masters are retained here; full prompts are in `prompts-v3.md`. Veil's source is 1730 × 909; Refraction's source is 1729 × 910. Both export at 1200 × 630 with a negligible centered crop.

The previous image-generated options are retained:

- `01-horizon-v2.jpg`: centered lockup above a cinematic curved light rim.
- `02-bloom-v2.jpg`: left-aligned wordmark beside a sculpted orange optical form.

Both were made with the built-in image generation tool using the brandkit skill and their approved original layouts. The generated PNG sources are saved here. Exact prompts are recorded in `prompts-v2.md`.

Image Gen returned 1730 × 909 PNGs. The build exports 1200 × 630 JPEGs with a negligible centered crop to match the required social ratio.

The four original options are retained:

- `01-horizon.jpg`: centered lockup, orange glow along the bottom.
- `02-bloom.jpg`: left-aligned wordmark, blurred orange light on the right.
- `03-drift.jpg`: stacked identity over a diagonal orange gradient.
- `04-afterglow.jpg`: large white symbol, lower orange glow.

`review.html` compares the two revised options. The original matching SVGs are self-contained editable masters with outlined type. They use the supplied Phaino mark and Outfit wordmark, with Inter for supporting text.

Rebuild from the repository root with `python website/assets/social/build.py`. This uses fontTools and the existing project Sharp dependency. The required Outfit and Inter fonts and their licenses are bundled in `fonts/`, so rebuilding needs only the website assets.

The social metadata in `website/src/pages/index.astro` selects Refraction v3 using an absolute URL. To select another option, update both `og:image` and `twitter:image`, plus both image alt descriptions. The existing `public/og.jpg` is retained.
