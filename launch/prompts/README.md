# Phaino launch prompts

Eight shots form a 36-second launch hero. Four separate teasers deliver vertical edits. The challenge file plans a 24-second recording of a real generation. These are instructions for later use; no media has been generated.

| File | Purpose | Target preset / model | Duration | Aspect ratio | Input image needed |
| --- | --- | --- | --- | --- | --- |
| [hero-01-dolly-in.md](hero-01-dolly-in.md) | Reveal the subject | `dolly-in` / LTX 2.5 | 4s | 16:9 | Yes |
| [hero-02-crash-zoom.md](hero-02-crash-zoom.md) | Show fast reframing | `crash-zoom` / LTX 2.5 | 3s | 16:9 | Yes |
| [hero-03-orbit.md](hero-03-orbit.md) | Show spatial parallax | `orbit` / LTX 2.5 | 5s | 16:9 | Yes |
| [hero-04-bullet-time.md](hero-04-bullet-time.md) | Freeze action | `bullet-time` / LTX 2.5 | 5s | 16:9 | Yes |
| [hero-05-whip-pan.md](hero-05-whip-pan.md) | Fast transition | `whip-pan` / LTX 2.5 | 3s | 16:9 | Yes |
| [hero-06-fpv-dive.md](hero-06-fpv-dive.md) | Show speed and scale | `fpv-dive` / LTX 2.5 | 5s | 16:9 | Yes |
| [hero-07-drone-pull-out.md](hero-07-drone-pull-out.md) | Reveal the landscape | `drone-pull-out` / LTX 2.5 | 6s | 16:9 | Yes |
| [hero-08-studio-result.md](hero-08-studio-result.md) | Connect result to product | `ltx25-i2v` / LTX 2.5 + real capture | 5s | 16:9 | Yes |
| [social-01-ltx-orbit.md](social-01-ltx-orbit.md) | Camera preset teaser | `orbit` / LTX 2.5 | 6s | 9:16 | Yes |
| [social-02-wan-light.md](social-02-wan-light.md) | Material and motion teaser | `wan22-i2v` / Wan 2.2 | 8s | 9:16 delivery, 480x832 source | Yes |
| [social-03-seedance-fabric.md](social-03-seedance-fabric.md) | Fabric motion teaser | `seedance25-i2v` / Seedance 2.5 | 8s | 9:16 | Yes |
| [social-04-kling-two-shots.md](social-04-kling-two-shots.md) | Two-shot teaser | `kling3-video` / Kling 3.0 | 8s, 3s + 5s | 9:16 crop from fixed 16:9 | Yes |
| [demo-trials.md](demo-trials.md) | Image, video, then character swap | `nano-banana-2`, MiniMax H3 i2v, `kawarimi-h3` | 1K stills, 6s video | 16:9 | Two Nano Banana images |
| [challenge-test.md](challenge-test.md) | Pick preset, generate, result | `orbit` / LTX 2.5 + real capture | 24s edit, 5s generation | 16:9 | Yes |

## Use

Paste only the positive block into Prompt. Camera presets append their own motion sentence; the blocks complement it without repeating it. Negative blocks go into Advanced > Negative prompt. Source blocks go into the named image preset, with Style set to None for FLUX. Use one image per source prompt, in the requested aspect. Keep default sampling settings initially. Record seeds and job settings alongside accepted outputs.

Black is `#000000`; orange is `#FF5B22`. Prompts describe orange light, but exact color belongs in the final grade. Use the supplied [mark](../../brand/phaino/phaino-mark.svg), never a generated logo. Keep its clear space, flat color and geometry. Use Outfit 700 or 800 for the wordmark, Mona Sans for other text. Add only factual labels such as the preset name, model or Phaino. UI and workflow shots are real captures, never generated interfaces. Mute generated audio in the assembled launch edit and add restrained impacts, air movement and room tone as needed.

## Suggested generation order

1. Prepare the challenge source with `flux2-klein-fast`, 16:9, count 1, default 4 steps. It is also hero 03's source. Save the accepted image.
2. Follow [challenge-test.md](challenge-test.md) to record one real 5-second Orbit generation. Keep that output for hero 03. Use the local app connected to Comfy Cloud; the hosted mockup only plays samples. Do not show API keys.
3. Prepare the other seven hero source images. Check framing before spending credits on animation. Generate hero 01, 02, 05, 07, 08, then 04 and 06, which ask for more difficult motion. Assemble in numbered order: 00:00 to 00:36, straight cuts, no overlapping transitions that shorten the plan.
4. Generate social 01 and 02 first using open models. Social 03 and 04 are optional partner-model passes. Partner models run through Comfy Router using the Comfy key in Settings; no configuration change is included here. If unavailable, the first two teasers remain usable.
5. Reuse accepted sources and outputs before rerolling. New vertical compositions are preferable to cropping wide hero footage. Kling is the exception because its checked-in preset fixes 16:9.

## Credits

No `preset.json` supplies a fixed credit price. The repository's [README](../../README.md) describes the app estimate as median runtime from recent jobs multiplied by 0.266 credits per second. This means execution time, not output-video seconds: a hypothetical 60-second run is about 16 credits; a 300-second run about 80. These examples are arithmetic, not measured model costs or partner prices.

The full first pass needs 12 distinct source images and 12 video jobs when the challenge output doubles as hero 03. Generated video totals 66 seconds, including Kling's two storyboards as one job. Do not multiply those 66 seconds by the runtime rate. Partner API pricing varies by model and settings; check the charge shown before submitting each job. No fixed partner price is assumed here.

For the 10,000-credit balance, a suggested spending cap is 500 for the challenge and calibration, 4,500 for the remaining hero work, 2,000 for teasers and 3,000 held for retries. These are spending limits, not cost forecasts. Measure one accepted run before scheduling batches.

## References

Preset IDs, controls and negative-field support come from all 15 checked-in [preset definitions](../../presets/) and their workflow exports. LTX prompts use continuous scene descriptions with explicit action and camera cues, following the [official prompting guide](https://docs.ltx.io/open-source-model/usage-guides/prompting-guide). Wan uses the checked-in 14B image-to-video workflow described in the [official ComfyUI guide](https://docs.comfy.org/tutorials/video/wan/wan2_2). This packet does not assert challenge eligibility rules or submission requirements.
