# Phaino

Pronounce Phaino **FY-no**. The name comes from Greek **φαίνω**, meaning "to bring to light, to show". Write **Phaino** with an uppercase P and lowercase haino.

Phaino is an open-source AI video and image studio on Comfy Cloud, built on ComfyUI. Cinematic camera-move presets start a shot. Every shot opens as an inspectable, forkable workflow.

## Mark

Use `../phaino-mark.svg` as the vector master. The mark is an image plane opening to reveal light: two filled shapes in a square, separated by a rising curved band. Keep the original paths, proportions and curve control points.

The master uses a `0 0 100 100` viewBox:

```svg
<path d="M0 19 Q0 9.5 9 9 Q55 3 100 1 V20 Q45 30 0 55 Z"/>
<path d="M100 30 V100 H4 Q0 100 0 96 V70 Q50 42 100 30 Z"/>
```

**Clear space:** define x as the band thickness at the right edge, from y=20 to y=30. At master size, x is 10 units. Leave at least **2x**, or 20 units, on every side of the mark. Apply that exclusion zone around the outer bounds of a mark and wordmark lockup. Keep it inside icon masks and circle crops.

**Minimum size:** the mark itself must be at least **16 × 16px**, excluding clear space. For a mark inside an app icon, size the container so the mark still meets that minimum. Use the mark alone for favicons. Do not put a wordmark into a 16px favicon.

Do:

- Use orange on black as the main treatment.
- Use black on orange for reversed applications. White is the neutral alternative when needed.
- Scale both shapes together and leave the band transparent so the background shows through.
- Use the same supplied mark in favicons, avatars, buttons, print and app icons.
- Set the wordmark in Outfit 700 or 800, with its single-story a.

Do not:

- Redraw the symbol as a P, a parallelogram or a straight diagonal slash.
- Change either curve, close the band, rotate, stretch or outline the mark.
- Add gradients, glow, bevels, shadows or secondary colors to the mark.
- Use mint or periwinkle as the main logo color.
- Crowd the mark with text, container edges or a busy image.

Rounded squares and circles are application containers. They do not change the mark. Keep the negative band open in reversed versions too.

## Color

| Color | Hex | Role |
| --- | --- | --- |
| Orange | `#FF5B22` | Primary brand color, mark, main action, active state, uppercase section titles |
| Mint | `#6CCBA0` | Small success and ready indicators |
| Periwinkle | `#898CE1` | Small information indicators |
| Black | `#000000` | Main app canvas, negative space, text on orange |
| White | `#FFFFFF` | Primary text on black, neutral surfaces, light controls |

Orange leads. Mint and periwinkle stay small, such as a dot, badge detail or short status label. Pair status color with readable text or an icon. Do not turn either accent into a hero background or a large gradient.

The palette uses golden-ratio hue spacing. With φ = (1 + √5) / 2 ≈ 1.618:

- Orange starts at approximately 15.5°.
- Mint: 15.5° + 360/φ² ≈ 15.5° + 137.5° ≈ 153°.
- Periwinkle: 15.5° + 360/φ ≈ 15.5° + 222.5° ≈ 238°.

The hex values above are authoritative. The angles explain their relationship; do not recalculate replacement colors. Golden-ratio spacing describes hue, not required screen-area percentages.

Use black text on solid orange buttons. Use white for primary text on the black app canvas. Keep borders and neutral controls quiet.

## Typography

**Outfit 700–800:** the Phaino wordmark only. Preserve the geometric letterforms and single-story a.

**Mona Sans:** display type, headings, body copy and interface text. Uppercase section titles and display headings run expanded at font-stretch 112.5%; body and UI text stays at normal width. Default body weight is 400; use 500–800 for emphasis.

**Geist Mono:** captions, labels, dimensions and code. Default weight is 400.

The scale starts at 14px and advances in half-steps of the golden ratio: √φ ≈ 1.272. Use the fixed rounded sizes below.

| Token | Size | Typical use |
| --- | ---: | --- |
| Caption | 11px | Geist Mono labels and metadata |
| Body | 14px | Mona Sans body and UI |
| Lead | 18px | Mona Sans introductions and prominent UI text |
| H3 | 23px | Mona Sans expanded section titles |
| H2 | 29px | Mona Sans expanded headings |
| H1 | 37px | Mona Sans expanded page headings |
| Display | 59px | Mona Sans expanded display; Outfit for wordmark specimens |

The display token skips the intermediate half-step near 47px. Keep the specified 59px value. Board wordmarks are enlarged identity specimens; app text uses the scale above.

## Application

Explore uses a true-black canvas with white text, wide cinematic media cards, a tools grid, uppercase orange section titles and floating "View all" pills. Keep the header compact and media prominent. A shot should offer a clear route to its workflow.

Use simple line icons for camera moves, video, images and workflows. Orange marks the main action. Mint means ready or success. Periwinkle means information. Avoid decorative sparkles and colored containers around every control.

For imagery, show light revealing a scene: dark architecture, directional beams, orange dust, clear silhouettes and restrained film grain. Use a strong focal point and deep shadows. Avoid generic robots, stock office scenes and purple-blue AI gradients.

Touchpoint examples use the same mark across browser favicons, padded iOS and desktop icon containers, circular social avatars and splash screens. The GitHub preview example uses 2:1 proportions. The OG example uses 1200:630 proportions. These are visual examples, not claims that native apps or accounts have shipped.

## Voice

Write plainly, briefly and specifically. Name the action or object. Use **Generate**, **Open workflow**, **Fork workflow**, **Ready** and **View all** when those labels describe the interface.

Use factual product descriptions such as "AI video and image studio". Do not add slogans, eyebrow labels, hype, invented social proof or em dashes. Use the Greek root to explain the name, not as a tagline.

## Board files

- `phaino-overview.png`: final 3 × 3 overview, 3200 × 2000px, 16:10.
- `phaino-touchpoints.png`: final 2 × 3 application board, 3200 × 2000px, 16:10.
- Matching `.svg` files are self-contained masters with exact mark paths, outlined type and embedded imagery.
- `variations/` retains two generated alternatives for each board. Overview B supplied the construction and image direction. Touchpoints A supplied the quieter black-led application direction. The final masters use the supplied geometry and actual font outlines to remove generation drift.
- `build_boards.py` rebuilds the SVG masters using the bundled fonts. `render_boards.cjs` exports PNGs using the project's existing Sharp dependency.
- `assets/` contains the original Outfit, Inter and Geist Mono font files and their open font licenses.
