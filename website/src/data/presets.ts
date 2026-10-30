import { resolve } from 'node:path';

/** The downloadable catalogue only lists workflows bundled with the local studio. */
export const tools = ['Camera moves', 'Video', 'Image'] as const;
export type Tool = (typeof tools)[number];

export const catalogue: { name: string; tool: Tool; io: string; file: string }[] = [
  { name: 'Orbit', tool: 'Camera moves', io: 'Image → video', file: 'orbit' },
  { name: 'Dolly in', tool: 'Camera moves', io: 'Image → video', file: 'dolly-in' },
  { name: 'Crash zoom', tool: 'Camera moves', io: 'Image → video', file: 'crash-zoom' },
  { name: 'Whip pan', tool: 'Camera moves', io: 'Image → video', file: 'whip-pan' },
  { name: 'Drone pull-out', tool: 'Camera moves', io: 'Image → video', file: 'drone-pull-out' },
  { name: 'Bullet time', tool: 'Camera moves', io: 'Image → video', file: 'bullet-time' },
  { name: 'FPV dive', tool: 'Camera moves', io: 'Image → video', file: 'fpv-dive' },
  { name: 'LTX 2.5', tool: 'Video', io: 'Image → video', file: 'ltx25-i2v' },
  { name: 'Wan 2.2', tool: 'Video', io: 'Image → video', file: 'wan22-i2v' },
  { name: 'FLUX.2 Klein', tool: 'Image', io: 'Prompt → image', file: 'flux2-klein' },
  { name: 'FLUX.2 Klein Fast', tool: 'Image', io: 'Prompt → image', file: 'flux2-klein-fast' },
  { name: 'Qwen Image', tool: 'Image', io: 'Prompt → image', file: 'qwen-image' },
];

/** Resolve the source JSON for a catalogue entry at build time. */
export const workflowPath = (preset: (typeof catalogue)[number]) =>
  resolve(process.cwd(), '../presets', preset.file, 'workflow.json');
