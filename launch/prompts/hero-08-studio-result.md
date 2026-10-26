# Hero 08: Result and workflow

Purpose: Close on the connection between a generated shot and its inspectable workflow.

Target: `ltx25-i2v`, LTX 2.5, plus a real Phaino screen recording. Aspect: 16:9. Duration: 5s generated plate and 5s final shot. FPS: 24. Input image: required.

Positive prompt, paste into Prompt:

```text
A locked cinematic medium view shows a rough black basalt slab in a dark concrete chamber. A thin opening in the slab casts an orange beam across the floor while a few dust particles drift slowly through it. The slab, framing and background remain still for the full take, leaving the left half of the image almost black. A 50mm lens keeps the lit stone edge sharp, with stable exposure and restrained grain. The scene holds quietly with faint room tone.
```

Negative prompt:

```text
camera movement, zoom, moving slab, flicker, exposure pumping, interface, screens, lettering, text, watermark, logo
```

Source image: `flux2-klein-fast`, Style None, 16:9, count 1. No image negative field is exposed.

```text
Cinematic medium photograph of one rough black basalt slab on the right half of a dark concrete chamber. A narrow opening in the slab casts a warm orange beam, approximately #FF5B22, across the floor. The left half is nearly pure black negative space. 50mm lens, realistic stone, sparse illuminated dust, deep shadows, restrained grain. Empty chamber, plain unlettered surfaces.
```

Camera and motion: Use the plain LTX preset so it does not append a camera move. Record actual Phaino result playback and the action that opens its workflow separately. Never ask the model to draw the app.

Edit: At 00:31 to 00:34 show the real result and workflow capture as two readable panels; at 00:34 to 00:36 show the generated plate with the supplied flat orange mark and Phaino wordmark in the black space.
