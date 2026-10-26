# Social 03: Fabric and stone

Purpose: A portrait teaser combining controlled cloth motion and a camera move.

Target: `seedance25-i2v`, Seedance 2.5, partner preset. Aspect: 9:16, set Ratio `9:16`. Duration: 8s. Resolution: 1080p. Input image: required. Partner models must already be enabled by the operator.

Positive prompt, paste into Prompt:

```text
One continuous eight-second cinematic shot based on the reference image. A long strip of black silk hangs beside a tall basalt pillar in an empty dark chamber, lit from the right by a narrow orange beam. For the first two seconds the fabric hangs nearly still. From seconds two to six, a gentle breeze carries its loose end slowly across the front of the pillar, creating one broad readable fold. The camera slides a short distance to the right on a level track, revealing the pillar's textured side without changing the subject's scale. During the final two seconds the fabric settles and the camera eases to a stop. Medium shot, 50mm lens, realistic silk and stone, deep black shadows, stable orange edge light, subtle grain. Quiet fabric rustle and room tone, no speech or music. Keep the scene in one location with no cuts or text.
```

Negative prompt: No separate negative field is exposed by this preset. Keep constraints in the positive block.

Source image: `nano-banana-2`, 9:16, resolution 1K for the first pass. No separate image negative field is exposed. If the partner image preset is unavailable, use this same composition prompt in `flux2-klein`, Style None, 9:16.

```text
Create a vertical cinematic still photograph. One tall rough black basalt pillar stands in an empty dark concrete chamber. A single long strip of matte black silk hangs beside it, with its loose lower end suspended just to the right of the pillar. Show the complete loose end and leave open space for it to cross the pillar. A narrow orange side light, approximately #FF5B22, reveals the stone texture and silk weave. Eye-level medium framing, 50mm lens, realistic materials, stable deep black shadows and restrained grain. Keep the subject in the middle two thirds of the frame and leave dark margins at top and bottom. Plain surfaces, no lettering or logos.
```

Camera and motion: Explicit beginning, action and settling beats suit this single reference-image shot. The template requests generated audio; mute it in the launch edit if it does not match the other clips.

Edit: Use the full 8s as a vertical post with a small “Seedance 2.5” label and supplied Phaino mark.
