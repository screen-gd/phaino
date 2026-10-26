# Challenge test: Orbit from preset to result

Purpose: A 24-second recording showing a real preset choice, generation and result, with an inspectable ComfyUI workflow.

Target: `orbit`, LTX 2.5, inside the local Phaino app connected to Comfy Cloud. Aspect: 16:9. Generated duration: 5s. FPS: 24. Final recording duration: 24s. Input image: required. Use the same accepted source as [hero 03](hero-03-orbit.md).

Positive prompt, paste into Prompt:

```text
A cinematic medium shot frames a single upright black basalt prism on a circular concrete plinth in a dark chamber. The prism remains rigid and motionless, with a narrow orange light illuminating its right edge. Three widely spaced background columns shift across the frame with clear parallax while the prism stays centered at a consistent size. A 50mm lens resolves the rough stone and the sharp edge of the plinth. A few dust particles drift slowly through the light, and the shadows stay deep and stable. One continuous take with faint room tone.
```

Negative prompt:

```text
cartoon, video game render, rotating object, spinning plinth, warped stone, duplicate prism, flicker, exposure pumping, text, watermark, logo
```

Source image: `flux2-klein-fast`, Style None, 16:9 (`1360x768`), count 1, default 4 steps and CFG 1. No image negative field is exposed.

```text
Cinematic photograph of one upright rough black basalt prism on a circular concrete plinth, centered in a dark spacious chamber. Three widely spaced concrete columns stand well behind it at different depths. A narrow orange light from camera right, approximately #FF5B22, catches the prism's right edge. The prism fills half the frame height, with clear space around the plinth and visible floor. Eye level, 50mm lens, crisp stone texture, restrained dust and film grain, deep black shadows. Empty architecture with plain unlettered surfaces.
```

Camera and motion: The preset adds its 90-degree orbit. The stone stays still; the shifting columns prove the viewpoint changes. Use the preset defaults for sampling. Set 5s, 24 fps and 16:9 explicitly before recording Generate.

## Recording plan

Prepare the source image and connect the local app before recording. The hosted mockup returns sample previews, so it cannot demonstrate this test. Keep credentials off screen. Record the real interaction through completion, however long it takes, then make the following 24-second edit. Do not generate an imitation interface.

| Edit time | Real footage |
| --- | --- |
| 00:00 to 00:04 | Open Camera moves and select Orbit. Keep the preset name readable. |
| 00:04 to 00:08 | Add the prepared first frame, paste the prompt, show 5s / 24 fps / 16:9. |
| 00:08 to 00:10 | Click Generate once; show the submitted job state. |
| 00:10 to 00:14 | Show actual progress. If the wait is longer, cut ahead with a plain “Wait shortened” caption. |
| 00:14 to 00:19 | Play the accepted five-second generated result once, large enough to see column parallax. |
| 00:19 to 00:22 | Open the actual Orbit workflow and hold the real node graph visibly. |
| 00:22 to 00:24 | Hold the result thumbnail and supplied Phaino mark with the wordmark on black. |

If any preparation takes longer, cut pauses or accelerate only the setup segment. Keep the Generate click and job submission visible at normal speed. A shortened wait does not claim that generation completed in four seconds. The uncut recording remains evidence of the actual run.

Accept the test when a real job completes and plays a stable five-second result with visible camera parallax. If it fails, keep the error for diagnosis and repeat the capture after a successful run. Do not substitute a bundled sample. Save the source, seed, settings, job identifier, output and uncut recording together. Check the challenge's current submission instructions separately before submitting.

Edit: Submit the 24-second recording if the challenge permits this format, and reuse the accepted generated clip as hero 03 without another video job.
