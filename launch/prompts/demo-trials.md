# Demo trials: image, video, character swap

Purpose: three runs that chain into one demo. Nano Banana 2 makes a still, MiniMax H3 turns it into a shot, and Kawarimi swaps the person for a new character while keeping the motion and camera. Only partner models and MiniMax H3 are available, so every step uses one of them.

Run everything in the local app connected to Comfy Cloud. The hosted demo only plays samples. Check the cost the app shows before each run.

The swap needs two pictures: the video and a character image. That means two Nano Banana images in total: the scene (1a) and the character (1b).

## 1a. Scene image: Nano Banana 2

Image, model Nano Banana 2. Aspect `16:9`, resolution `1K` for trials, `2K` for the final take.

```text
Cinematic photograph of one woman in her late twenties standing in a long, dark underground concrete corridor. She wears a plain black jacket, black trousers and white sneakers, hair tied back, hands relaxed at her sides. She faces the camera from about six meters away, full body visible from head to feet with space above and below. One orange strip light, color #FF5B22, runs along the ceiling and rims her shoulders and hair; the rest of the corridor falls into deep shadow with a faint wet sheen on the floor. Eye level, 35mm lens, centered. Realistic skin and fabric, light film grain, no other people, no text, no logos.
```

Accept it when there is exactly one person, whole body in frame, face clear, hands normal.

## 1b. Character image: Nano Banana 2

Same model. Aspect `9:16`, resolution `1K`.

```text
Full-body studio photograph of an original humanoid robot standing upright and facing the camera, arms relaxed at its sides. Slim human proportions, matte black armor panels, thin glowing orange seams, color #FF5B22, along the joints, and a smooth dark glass visor in place of a face. Plain dark grey seamless background, soft even front light, the whole figure visible from head to feet with space around it. Realistic materials, sharp detail, no text, no logos, no weapons.
```

A full-body, front-facing character on a plain background gives the swap models the cleanest reference. Keep the proportions human so it fits the woman's motion.

## 2. Video: MiniMax H3

Video, model MiniMax H3, image to video. First frame: image 1a. Aspect `16:9`, duration `6`s. Stay at 10s or less so every swap engine accepts the clip (MiniMax H3 swap takes up to 15s, Seedance and Kling O1 up to 10s).

```text
The woman walks slowly toward the camera down the dark corridor, steady natural steps, arms swinging gently. After four seconds she stops, turns her head to look over her right shoulder, then looks back at the camera. The camera tracks backward at the same pace, keeping her full body centered and in frame the whole time. The orange strip light glides along her shoulders as she moves. One continuous shot, no cuts, quiet footsteps echoing.
```

Accept it when she stays whole and in frame the entire time, nothing passes in front of her, and the motion is smooth. A clean, unblocked person is what makes the swap work.

## 3. Final: Kawarimi character swap

Kawarimi, engine MiniMax H3. Source video: the step 2 result (pick it from the Library). Character: image 1b. Resolution `768P` for trials, `2K` for the final take. Keep the default prompt:

```text
Replace the person in <Video 1> with the character from <Picture 1>. Keep the motion, camera and background.
```

To compare engines, run the same pair through Seedance 2.5 Video Editing or Kling O1 Video Edit with their default prompts.

Accept it when the robot follows every step and the head turn, the corridor and camera move match the source, and the orange light still falls across its shoulders.

## Recording order

1. Generate 1a and show the result.
2. Animate it with MiniMax H3 and play the shot.
3. Open Kawarimi, drop in the shot and the robot, run the swap.
4. Play source and swap side by side using the compare view.

Prepare 1b before recording so the story stays on one subject. Save seed, settings and job ID for each accepted output so the final take can match it. Mute generated audio in the edit unless the swap keeps the original footsteps you want.
