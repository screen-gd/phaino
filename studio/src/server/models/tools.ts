/**
 * The Edit Video tool registry: AI tools that take an existing video, each
 * backed by one official Comfy template synced by `pnpm models:sync` into
 * models/cache. Synthetic preset ids are `edit-<toolId>`.
 *
 * Excluded templates: utility-bria_remove_video_background (Bria API node);
 * utility_nvidia_rtx_video_enhance, utility_video_upscale, the VHS-based
 * FILM/GIMM/DepthAnything v2 templates and the LTX 2.3 LoRA tools all need
 * custom nodes.
 */

import type { IconName } from "@/components/icons";

export type ToolProbe = {
  width: number;
  height: number;
  frames: number;
  fps: number;
};

export type DerivedWrite = { node: string; field: string; value: number };

export type EditTool = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  /** Official workflow_templates entry; absent means app code (extend). */
  template?: string;
  /** Source clips longer than this are trimmed to the first N seconds. */
  maxSeconds?: number;
  /** The tool takes a prompt the user edits. */
  prompt?: boolean;
  /** class_type + field hint when prompt tracing is ambiguous. */
  promptHint?: { nodeClass: RegExp; field: string };
  /** Prompt field label; defaults to "Prompt". */
  promptLabel?: string;
  /** Prompt field placeholder; defaults to "Describe it". */
  promptPlaceholder?: string;
  controls?: {
    /** Target aspect for the reframe tool (drives ImagePadForOutpaint). */
    aspect?: boolean;
    /** 2x/4x multiplier when the template exposes one. */
    multiplier?: boolean;
    /** Target resolution when a single node controls output size. */
    size?: boolean;
    /** Optional style reference image. */
    reference?: boolean;
  };
};

export const EDIT_TOOLS = [
  {
    id: "upscale",
    label: "Upscale",
    description: "Sharper, higher resolution",
    icon: "frame",
    template: "utility_seedvr2_3b_int8_upscale_video",
    maxSeconds: 10,
    controls: { size: true },
  },
  {
    id: "upscale-fast",
    label: "Upscale Fast",
    description: "Quick 4x upscale",
    icon: "arrowUpRight",
    template: "utility-gan_upscaler",
    maxSeconds: 10,
  },
  {
    id: "fps-boost",
    label: "FPS Boost",
    description: "Smoother motion",
    icon: "clock",
    template: "utility_video_frame_interpolation",
    maxSeconds: 10,
    controls: { multiplier: true },
  },
  {
    id: "depth",
    label: "Depth Map",
    description: "Depth pass from any clip",
    icon: "effects",
    template: "utility_depth_anything3_video_depth_estimation",
    maxSeconds: 20,
  },
  {
    id: "reframe",
    label: "Reframe",
    description: "Extend to a new aspect",
    icon: "frame",
    template: "video_wan_vace_outpainting",
    maxSeconds: 5,
    prompt: true,
    promptPlaceholder: "Describe what fills the new space",
    controls: { aspect: true },
  },
  {
    id: "remove",
    label: "Remove Object",
    description: "Erase anything you name",
    icon: "trash",
    template: "video_wan_vace_inpainting",
    maxSeconds: 5,
    prompt: true,
    promptHint: { nodeClass: /SAM3.*Detect/i, field: "text" },
    promptLabel: "What to remove",
    promptPlaceholder: "Name the object to remove",
  },
  {
    id: "relight",
    label: "Relight",
    description: "New light, same shot",
    icon: "effects",
    template: "video_bernini_r_video_editing",
    maxSeconds: 5,
    prompt: true,
    // Bernini keeps the user prompt in a multiline primitive; the traced
    // conditioning string is its system-prompt RegexExtract.
    promptHint: { nodeClass: /^PrimitiveStringMultiline$/, field: "value" },
    promptPlaceholder: "Describe the new light",
  },
  {
    id: "restyle",
    label: "Restyle",
    description: "Same motion, new look",
    icon: "pencil",
    template: "video_wan_vace_14B_v2v",
    maxSeconds: 5,
    prompt: true,
    promptPlaceholder: "Describe the new look",
    controls: { reference: true },
  },
  {
    id: "extend",
    label: "Extend",
    description: "Continue the shot",
    icon: "plus",
    prompt: true,
  },
] satisfies readonly EditTool[];

export function editTool(id: string): EditTool | null {
  return EDIT_TOOLS.find((t) => t.id === id) ?? null;
}

/** The synthetic preset id for a tool: `edit-<toolId>`, always a valid slug. */
export function toolPresetId(tool: EditTool): string {
  return `edit-${tool.id}`;
}

/** Find the tool a synthetic `edit-*` preset id belongs to. */
export function toolForPresetId(id: string): EditTool | null {
  if (!id.startsWith("edit-")) return null;
  return editTool(id.slice(5));
}

export const REFRAME_ASPECTS = ["9:16", "1:1", "4:5", "16:9"] as const;
export type ReframeAspect = (typeof REFRAME_ASPECTS)[number];

const r16 = (n: number) => Math.max(0, Math.round(n / 16) * 16);

/**
 * Left/right/top/bottom pads for ImagePadForOutpaint: the source centred on a
 * canvas at the target aspect, each side an even split rounded to a multiple
 * of 16. Sources wider than the target on both axes yield zero pads.
 */
export function outpaintPads(
  srcW: number,
  srcH: number,
  aspect: ReframeAspect,
): { left: number; top: number; right: number; bottom: number } {
  const [aw, ah] = aspect.split(":").map(Number);
  const target = aw / ah;
  const src = srcW / srcH;
  let canvasW = srcW;
  let canvasH = srcH;
  if (src < target) {
    // Source narrower: pad the sides to reach the wider target aspect.
    canvasW = srcH * target;
  } else if (src > target) {
    // Source wider: pad top and bottom.
    canvasH = srcW / target;
  }
  const dw = r16(Math.max(0, canvasW - srcW) / 2);
  const dh = r16(Math.max(0, canvasH - srcH) / 2);
  return { left: dw, right: dw, top: dh, bottom: dh };
}
