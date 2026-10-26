# Social 02: Moving light

Purpose: Show subtle material motion on Wan 2.2.

Target: `wan22-i2v`, Wan 2.2 14B. Aspect: portrait, Size `480x832` (the preset's 9:16 option). Duration: 8s. FPS: template default 16. Input image: required. Deliver as 9:16 after a small vertical crop, for example 468x832 before resizing.

Positive prompt, paste into Prompt:

```text
A thin sheet of black silk hangs in a dark concrete chamber, its right edge traced by orange side light. A gentle breeze lifts the lower edge once and sends a slow diagonal fold upward through the cloth. The fold travels from lower right to upper left, then the fabric settles almost still. The camera makes a very slow forward push, preserving the sheet's outline. Medium shot, 50mm lens, visible fine weave, soft realistic highlights, deep black background and constant low key lighting. One continuous shot.
```

Negative prompt:

```text
static image, frozen fabric, liquid cloth, tearing, duplicate sheets, tangled folds, rapid flapping, camera shake, flicker, overexposure, oversaturation, text, subtitles, watermark, logo
```

Source image: `qwen-image`, aspect 9:16 (`928x1664`). Keep the default image negative prompt.

```text
Vertical cinematic studio photograph of a single thin sheet of black silk hanging freely in a dark concrete chamber. The complete sheet is visible in the middle two thirds of the composition, with a loose lower right corner and one shallow diagonal fold. Orange side light from camera right, approximately #FF5B22, traces the right edge and reveals the fine weave. 50mm lens, realistic matte fabric, deep black background, restrained grain. Dark empty space above and below the fabric, plain surfaces without lettering.
```

Camera and motion: One cloth movement and a slight push only. Keep default 20 steps and CFG 3.5 for the first run. The checked-in workflow renders at 16 fps; conform to the edit frame rate without speeding the action up. Its frame calculation can add one frame beyond the nominal duration; trim to 8s.

Edit: Use the full 8s with a small “Wan 2.2” label and supplied Phaino mark, letting the fold provide the visual change.
