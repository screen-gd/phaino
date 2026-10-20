# Explore page media

`hero.webp` is original AI-generated artwork made for the Phaino site. The other images are Unsplash photos under the [Unsplash License](https://unsplash.com/license), used as placeholders until real Phaino outputs replace them. They are not Phaino-generated output or product screenshots.

## Photography sources

| Slot | Source |
| --- | --- |
| reveal.webp, moves.webp | https://images.unsplash.com/photo-1464822759023-fed622ff2c3b |
| image.webp, light.webp | https://images.unsplash.com/photo-1519681393784-d120267933ba |
| video.webp, rain.webp | https://images.unsplash.com/photo-1441974231531-c6227db76b6e |
| effects.webp, blue.webp | https://images.unsplash.com/photo-1518837695005-2083093ee35b |
| edit.webp, closer.webp | https://images.unsplash.com/photo-1470770841072-f978cf4d019e |

## Optional video loops

Tool tiles can show a short looping preview. Drop files at `explore/tools/<tool>.mp4` (4-8s H.264, yuv420p, no audio, faststart, under 3 MB). The tile checks at render time and plays the loop on hover or focus; with no file present it renders the WebP still.

## Explore video sources

The model carousel streams official examples from their original hosts. These are model demos, not outputs generated in Phaino. URLs and credits live in `src/lib/explore-media.ts`.

- LTX 2.5: https://comfy.org/ltx-2.5/
- Wan 2.2: https://docs.comfy.org/tutorials/video/wan/wan2_2

`examples/wan22.webp` is a first-frame thumbnail extracted from the official Wan 2.2 demo video. Other model posters use Comfy's original media host.

## Generated example assets (examples/)

Local copies of open-model examples, transcoded/cropped for the app. All are from `Comfy-Org/workflow_templates` (MIT License, Copyright (c) 2023-present Comfy Org) — workflow output media. Credit: Comfy.

| File | Model | Source | License | Credit |
| --- | --- | --- | --- | --- |
| ltx25-t2v.mp4, ltx25-t2v.webp | LTX 2.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_5_t2v.mp4 | MIT | Comfy |
| ltx25-flf2v.mp4, ltx25-flf2v.webp | LTX 2.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_5_flf2v.mp4 | MIT | Comfy |
| ltx25-dfr-i2v.mp4, ltx25-dfr-i2v.webp | LTX 2.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_5_dfr_i2v.mp4 | MIT | Comfy |
| qwen-image.webp | Qwen Image | https://github.com/Comfy-Org/workflow_templates/blob/main/output/image_qwen_image.png | MIT | Comfy |
| qwen-gummy.webp | Qwen Image | https://github.com/Comfy-Org/workflow_templates/blob/main/output/template_sugar_coated_gummy_style_qwen.png | MIT | Comfy |
| flux2-klein.webp | FLUX.2 Klein | https://github.com/Comfy-Org/workflow_templates/blob/main/output/image_flux2_klein_text_to_image.png | MIT | Comfy |
| kling3.webp | Kling 3.0 (partner, unused) | Kling 3.0 demo poster | — | retained, not referenced |

Made with Comfy streams four short LTX 2.5 demos (5–8 seconds) from Comfy's model showcase. The cards omit visible titles and retain a source link. Videos autoplay muted and loop while visible, pause offscreen or when the page is hidden, and respect reduced motion. The wide banner uses the original hero image with its Orbit headline, description and studio/workflow buttons. It has no thumbnail selector footer.
## Image model examples

The image studio, model picker and Explore image cards use locally cached WebP versions of Comfy's official examples. They are model examples, not Phaino user outputs.

| Files | Official source | Original image |
| --- | --- | --- |
| models/flux2-klein.webp, models/flux2-klein-fast.webp | https://docs.comfy.org/tutorials/flux/flux-2-klein | https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/output/image_flux2_klein_text_to_image.png |
| models/nano-banana-2.webp (partner, retained but unreferenced) | https://comfy.org/hub/models/nano-banana-2-text-to-image/ | https://media.comfy.org/website/workshop/vertexai/gemini-nano-banana-2/helical-staircase-from-above.png |
| models/qwen-image.webp | https://blog.comfy.org/p/qwen-image-in-comfyui-new-era-of | https://substack-post-media.s3.amazonaws.com/public/images/06850c28-f6a5-4201-a2dc-cb9c73e0780b_1024x1024.png |