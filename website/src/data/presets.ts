import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Every preset named in the product brief, grouped by studio tool. `file` is the slug of
    its ComfyUI workflow in public/workflows; availability is read from disk, never assumed. */
export const tools = ['Camera moves', 'Video', 'Effects', 'Image', 'Avatars', 'Edit'] as const;
export type Tool = (typeof tools)[number];

export const catalogue: { name: string; tool: Tool; io: string; file: string }[] = [
  { name: 'Orbit', tool: 'Camera moves', io: 'Image → video', file: 'orbit' },
  { name: 'Dolly in', tool: 'Camera moves', io: 'Image → video', file: 'dolly-in' },
  { name: 'Crash zoom', tool: 'Camera moves', io: 'Image → video', file: 'crash-zoom' },
  { name: 'Whip pan', tool: 'Camera moves', io: 'Image → video', file: 'whip-pan' },
  { name: 'Drone pull-out', tool: 'Camera moves', io: 'Image → video', file: 'drone-pull-out' },
  { name: 'Bullet time', tool: 'Camera moves', io: 'Image → video', file: 'bullet-time' },
  { name: 'FPV dive', tool: 'Camera moves', io: 'Image → video', file: 'fpv-dive' },
  { name: 'Image to video', tool: 'Video', io: 'Image → video', file: 'image-to-video' },
  { name: 'Text to video', tool: 'Video', io: 'Prompt → video', file: 'text-to-video' },
  { name: 'Set extension', tool: 'Effects', io: 'Video → video', file: 'set-extension' },
  { name: 'Match cut', tool: 'Effects', io: 'Two clips → video', file: 'match-cut' },
  { name: 'Morph', tool: 'Effects', io: 'Two images → video', file: 'morph' },
  { name: 'Explode', tool: 'Effects', io: 'Image → video', file: 'explode' },
  { name: 'Melt', tool: 'Effects', io: 'Image → video', file: 'melt' },
  { name: 'Text to image', tool: 'Image', io: 'Prompt → image', file: 'text-to-image' },
  { name: 'Style presets', tool: 'Image', io: 'Prompt → image', file: 'style-presets' },
  { name: 'Consistent character', tool: 'Image', io: 'Reference → image', file: 'consistent-character' },
  { name: 'Lipsync', tool: 'Avatars', io: 'Photo + voice → video', file: 'lipsync' },
  { name: 'Inpaint', tool: 'Edit', io: 'Image + mask → image', file: 'inpaint' },
  { name: 'Outpaint', tool: 'Edit', io: 'Image → wider image', file: 'outpaint' },
  { name: 'Relight', tool: 'Edit', io: 'Image → image', file: 'relight' },
  { name: 'Upscale', tool: 'Edit', io: 'Image or video → 4K', file: 'upscale' },
];

const publicDir = join(process.cwd(), 'public');

/** True when the preset's workflow JSON ships with the site. */
export const workflowReady = (file: string) => existsSync(join(publicDir, 'workflows', `${file}.json`));
