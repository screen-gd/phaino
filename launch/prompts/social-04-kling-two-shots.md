# Social 04: Two views of glass

Purpose: Show the Kling preset's two-storyboard sequence in one short teaser.

Target: `kling3-video`, Kling 3.0, partner preset. Duration: 8s total, set Duration `3` and Shot 2 duration `5`. Resolution: 1080p. Input image: required. Generation aspect: fixed 16:9 in the checked-in workflow. Delivery aspect: 9:16 center crop. Partner models must already be enabled by the operator.

Positive prompt for Prompt, storyboard 1, 3s:

```text
A single translucent orange glass sphere stands on a narrow black stone plinth in a deep black gallery, matching the reference image. Medium shot, 50mm lens. The camera pushes forward slowly for three seconds while the sphere remains motionless. A narrow orange side light reveals the sphere's internal caustic and smooth surface. Keep the sphere and plinth entirely within the central quarter of the image width, with empty black space on both sides. Realistic glass, stable illumination, restrained grain, quiet room tone, no speech or on-screen text.
```

Positive prompt for Shot 2 prompt (`prompt2`), storyboard 2, 5s:

```text
Cut to a closer view of the same orange glass sphere on the same black stone plinth in the same dark gallery. The camera slides gently to the right for four seconds, causing the reflected vertical light slit to travel across the glass, then holds for one second. The sphere stays motionless and centered, its entire outline contained inside the central quarter of the image width. 85mm lens, shallow background focus, sharply resolved glass edge, constant orange side light and deep black surroundings. Preserve the sphere's size and material across the cut. Quiet room tone, no speech, music or on-screen text.
```

Negative prompt: No separate negative field is exposed by this preset. Keep constraints in both storyboard prompts.

Source image: `nano-banana-2`, 16:9, resolution 1K for the first pass. No separate image negative field is exposed. Alternatively use `flux2-klein`, Style None, 16:9, with this same prompt.

```text
Create a wide 16:9 cinematic photograph designed for a later vertical center crop. One small translucent orange glass sphere rests on a narrow matte black stone plinth at the exact center of a dark gallery. The whole sphere and the visible plinth fit inside the central quarter of the image width. The sphere occupies roughly one fifth of the frame width. The outer left and right portions contain only deep black negative space. A narrow orange side light, approximately #FF5B22, creates an internal caustic and a clean vertical reflection. Medium framing, 50mm lens, realistic glass and stone, restrained grain, unlettered surfaces, no logos.
```

Camera and motion: These are two separate prompt fields, not one combined prompt. Do not request an aspect control the preset does not expose. A portrait center crop retains about 31.6% of the source width, so keep both shots within the central quarter and inspect the second shot's framing before accepting. Cropping a 1920x1080 source leaves about 608x1080; enlarging to 1080x1920 adds no detail. The template requests audio; mute it for a consistent edit.

Edit: Center-crop both storyboards to 9:16 and use all 8s with the factual label “Kling 3.0” and the supplied Phaino mark.
