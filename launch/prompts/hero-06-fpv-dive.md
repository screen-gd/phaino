# Hero 06: Quarry descent

Purpose: Demonstrate a fast downward flight through architecture.

Target: `fpv-dive`, LTX 2.5. Aspect: 16:9. Duration: 5s. FPS: 24. Input image: required.

Positive prompt, paste into Prompt:

```text
A cinematic aerial view looks down into a vast black basalt quarry at night. A narrow orange-lit route on the quarry floor remains visible between two widely separated rock walls. The ground approaches quickly as foreground ledges rush upward past the frame edges, with a slight controlled bank to the right. An 18mm wide lens keeps the destination visible while the walls retain solid geometry. Sparse dust catches the orange light, and the central route stays sharp enough to follow through the descent. The shot is one continuous flight with rushing air.
```

Negative prompt:

```text
camera collision, wall penetration, tunnel, looping flight, rolling horizon, fisheye distortion, collapsing cliffs, flicker, text, watermark, logo
```

Source image: `flux2-klein`, Style None, 16:9, count 1. Leave its image negative field empty.

```text
Cinematic aerial photograph from high above a vast black basalt quarry at night, looking down at a steep angle. Two widely separated rock walls frame an unobstructed descent toward a thin orange-lit route on the quarry floor. The route is visible near the lower center and continues into the distance. Broad foreground ledges give depth, with ample open air between them. 18mm wide lens, realistic rock strata, sparse orange-lit dust, black sky and deep shadows, orange approximately #FF5B22. Empty landscape with plain rock surfaces.
```

Camera and motion: The preset supplies the steep forward dive and slight bank. Leave the path open; this shot does not ask the model to pass through a narrow gap.

Edit: Use 00:20 to 00:25, carrying the motion into the following aerial reveal.
