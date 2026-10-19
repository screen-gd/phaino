# Cutaway media slots

The hero is original AI-generated coastal artwork, created for this landing page. Its source is preserved in assets/hero-coast-original.png, with compressed 640 / 1280 / 1920px WebP variants. It is art direction, not a claim about FLUX or LTX output. The other WebP images are illustrative photography, not Cutaway-generated output or product screenshots. Replace them with original FLUX / LTX results when available. Community handles and fork counts are sample data. The before/after uses the same photo with an intentionally flat CSS grade, not a claim about an upscaling model.

## Video paths

Drop footage into these paths and rebuild. The Astro Media component detects files at build time, renders captions-ready video only for existing files, and retains the matching WebP as the initial poster. No empty MP4 files or broken source URLs are shipped.

```
public/media/hero.mp4
public/media/capabilities/image.mp4
public/media/capabilities/video.mp4
public/media/capabilities/moves.mp4
public/media/capabilities/effects.mp4
public/media/capabilities/avatar.mp4
public/media/capabilities/edit.mp4
public/media/moves/orbit.mp4
public/media/moves/dolly-in.mp4
public/media/moves/crash-zoom.mp4
public/media/moves/whip-pan.mp4
public/media/moves/drone-pull-out.mp4
public/media/moves/bullet-time.mp4
public/media/moves/fpv-dive.mp4
```

Use 4–8 second H.264 MP4 loops, yuv420p, no audio, and faststart. Target under 3 MB per clip, 1280×720 for cards, 1920×1080 for hero. Add meaningful captions to captions.vtt if clips have speech. Offscreen videos pause; reduced motion starts on the poster; the page-level Motion control pauses loops and scroll choreography. Dialog video has native playback controls.

## Photography sources

Photos served by Unsplash, under the [Unsplash License](https://unsplash.com/license). These are placeholder frames, not product evidence. Source IDs are kept for replacement and attribution.

| Slot | Source |
| --- | --- |
| Moves / orbit, community / reveal | https://images.unsplash.com/photo-1464822759023-fed622ff2c3b |
| Image, drone pull-out, last light | https://images.unsplash.com/photo-1519681393784-d120267933ba |
| Video, dolly-in, FPV dive, after the rain | https://images.unsplash.com/photo-1441974231531-c6227db76b6e |
| Effects, whip-pan, into the blue | https://images.unsplash.com/photo-1518837695005-2083093ee35b |
| Avatar, crash zoom, quiet orbit | https://images.unsplash.com/photo-1534528741775-53994a69daeb |
| Edit, bullet time, a little closer, before/after | https://images.unsplash.com/photo-1470770841072-f978cf4d019e |

All served locally as compressed WebP. No third-party image requests occur at runtime.

grain.png is a deterministic 128px raster texture. It replaces the moving SVG turbulence filter, which caused expensive rasterization during the hero expansion.
