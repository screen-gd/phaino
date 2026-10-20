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

All model demos and the Made with Comfy grid serve local copies from `Comfy-Org/workflow_templates` (MIT License, Copyright (c) 2023-present Comfy Org); nothing is hotlinked. These are model demos, not outputs generated in Phaino. URLs and credits live in `src/lib/explore-media.ts`.

## Generated example assets (examples/)

Local copies of open-model examples, transcoded/cropped for the app. All are from `Comfy-Org/workflow_templates` at ref `46e060e` (MIT License, Copyright (c) 2023-present Comfy Org) — workflow output media. Videos are H.264 yuv420p, no audio, faststart, max 720px wide; posters are first-frame WebP. Credit: Comfy.

| File | Model | Source | License | Credit |
| --- | --- | --- | --- | --- |
| ltx25-i2v.mp4, ltx25-i2v.webp | LTX 2.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_5_i2v.mp4 | MIT | Comfy |
| ltx25-t2v.mp4, ltx25-t2v.webp | LTX 2.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_5_t2v.mp4 | MIT | Comfy |
| ltx25-flf2v.mp4, ltx25-flf2v.webp | LTX 2.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_5_flf2v.mp4 | MIT | Comfy |
| ltx25-dfr-i2v.mp4, ltx25-dfr-i2v.webp | LTX 2.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_5_dfr_i2v.mp4 | MIT | Comfy |
| ltx23-i2v.mp4, ltx23-i2v.webp | LTX 2.3 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_3_i2v.mp4 | MIT | Comfy |
| ltx23-t2v.mp4, ltx23-t2v.webp | LTX 2.3 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_ltx2_3_t2v.mp4 | MIT | Comfy |
| wan22-i2v.mp4, wan22.webp | Wan 2.2 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_wan2_2_14B_i2v.mp4 | MIT | Comfy |
| minimax-h3-t2v.mp4, minimax-h3-t2v.webp | MiniMax H3 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_minimax_h3_t2v.mp4 | MIT | Comfy |
| hunyuan15-t2v.mp4, hunyuan15-t2v.webp | HunyuanVideo 1.5 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_hunyuan_video_1.5_720p_t2v.mp4 | MIT | Comfy |
| fasth3-t2v.mp4, fasth3-t2v.webp | FastH3 | https://github.com/Comfy-Org/workflow_templates/blob/main/output/video_fastvideo_fasth3_t2v.mp4 | MIT | Comfy |
| qwen-image.webp | Qwen Image | https://github.com/Comfy-Org/workflow_templates/blob/main/output/image_qwen_image.png | MIT | Comfy |
| qwen-gummy.webp | Qwen Image | https://github.com/Comfy-Org/workflow_templates/blob/main/output/template_sugar_coated_gummy_style_qwen.png | MIT | Comfy |
| flux2-klein.webp | FLUX.2 Klein | https://github.com/Comfy-Org/workflow_templates/blob/main/output/image_flux2_klein_text_to_image.png | MIT | Comfy |

Made with Comfy shows four local template examples (MiniMax H3, HunyuanVideo 1.5, LTX 2.3, FastH3). The cards omit visible titles and retain a source link. Videos autoplay muted and loop while visible, pause offscreen or when the page is hidden, and respect reduced motion. The wide banner uses the original hero image with its Orbit headline, description and studio/workflow buttons. It has no thumbnail selector footer.
## Image model examples

The image studio, model picker and Explore image cards use locally cached WebP versions of Comfy's official examples. They are model examples, not Phaino user outputs.

| Files | Official source | Original image |
| --- | --- | --- |
| models/flux2-klein.webp, models/flux2-klein-fast.webp | https://docs.comfy.org/tutorials/flux/flux-2-klein | https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/output/image_flux2_klein_text_to_image.png |
| models/qwen-image.webp | https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_qwen_Image_2512.json | https://github.com/Comfy-Org/workflow_templates/blob/main/output/image_qwen_Image_2512.png (MIT) |
