export type ExploreMedia = {
  src: string;
  poster: string;
  kind: "video" | "image";
  w: number;
  h: number;
};

export type MediaItem = {
  title: string;
  description: string;
  href: string;
  credit: string;
  source: string;
  model: string;
  media: ExploreMedia;
  /** In-app workflow viewer link, resolved server-side per item. */
  viewerHref?: string;
};

export const MODEL_DEMOS = [
  {
    title: "Camera moves",
    description: "Explore 7 camera moves on LTX 2.5",
    href: "/camera",
    credit: "LTX 2.5 workflow example · Comfy (MIT)",
    source:
      "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_5_i2v.json",
    model: "ltx-2.5",
    media: {
      kind: "video",
      w: 720,
      h: 396,
      src: "/explore/examples/ltx25-i2v.mp4",
      poster: "/explore/examples/ltx25-i2v.webp",
    },
  },
  {
    title: "LTX 2.3",
    description: "Image to video on LTX 2.3",
    href: "/video?preset=ltx23-i2v",
    credit: "LTX 2.3 workflow example · Comfy (MIT)",
    source:
      "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_3_i2v.json",
    model: "ltx23",
    media: {
      kind: "video",
      w: 720,
      h: 396,
      src: "/explore/examples/ltx23-i2v.mp4",
      poster: "/explore/examples/ltx23-i2v.webp",
    },
  },
  {
    title: "Wan 2.2",
    description: "Image to video with an open model",
    href: "/video?preset=wan22-i2v",
    credit: "Wan 2.2 workflow example · Comfy (MIT)",
    source:
      "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_wan2_2_14B_i2v.json",
    model: "wan-2.2",
    media: {
      kind: "video",
      w: 640,
      h: 640,
      src: "/explore/examples/wan22-i2v.mp4",
      poster: "/explore/examples/wan22.webp",
    },
  },
  {
    title: "LTX 2.5 text to video",
    description: "Write a prompt, get a clip",
    href: "/video?preset=ltx25-t2v",
    credit: "LTX 2.5 workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_5_t2v.json",
    model: "ltx-2.5",
    media: {
      kind: "video",
      w: 720,
      h: 412,
      src: "/explore/examples/ltx25-t2v.mp4",
      poster: "/explore/examples/ltx25-t2v.webp",
    },
  },
  {
    title: "LTX 2.5 first and last frame",
    description: "Anchor both ends of the shot",
    href: "/video?preset=ltx25-flf2v",
    credit: "LTX 2.5 workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_5_flf2v.json",
    model: "ltx-2.5",
    media: {
      kind: "video",
      w: 720,
      h: 396,
      src: "/explore/examples/ltx25-flf2v.mp4",
      poster: "/explore/examples/ltx25-flf2v.webp",
    },
  },
  {
    title: "LTX 2.5 guided video",
    description: "Image to video with depth guidance",
    href: "/video?preset=ltx25-i2v",
    credit: "LTX 2.5 workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_5_dfr_i2v.json",
    model: "ltx-2.5",
    media: {
      kind: "video",
      w: 720,
      h: 396,
      src: "/explore/examples/ltx25-dfr-i2v.mp4",
      poster: "/explore/examples/ltx25-dfr-i2v.webp",
    },
  },
  {
    title: "Qwen Image",
    description: "Text to image with the open Qwen model",
    href: "/image?preset=qwen-image",
    credit: "Qwen Image workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_qwen_image.json",
    model: "qwen-image-2512",
    media: {
      kind: "image",
      w: 1280,
      h: 1280,
      src: "/explore/examples/qwen-image.webp",
      poster: "/explore/examples/qwen-image.webp",
    },
  },
  {
    title: "Qwen Image styles",
    description: "Stylised output from the same model",
    href: "/image?preset=qwen-image",
    credit: "Qwen Image LoRA workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/template_sugar_coated_gummy_style_qwen.json",
    model: "qwen-image-2512",
    media: {
      kind: "image",
      w: 1280,
      h: 1280,
      src: "/explore/examples/qwen-gummy.webp",
      poster: "/explore/examples/qwen-gummy.webp",
    },
  },
  {
    title: "FLUX.2 Klein",
    description: "Text to image with the open FLUX model",
    href: "/image?preset=flux2-klein",
    credit: "FLUX.2 Klein workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_flux2_klein_text_to_image.json",
    model: "flux2-klein-4b",
    media: {
      kind: "image",
      w: 1024,
      h: 1024,
      src: "/explore/examples/flux2-klein.webp",
      poster: "/explore/examples/flux2-klein.webp",
    },
  },
] satisfies MediaItem[];

export const COMFY_CREATIONS = [
  {
    title: "MiniMax H3",
    description: "",
    href: "/video?preset=minimax-h3-t2v",
    credit: "MiniMax H3 workflow example · Comfy (MIT)",
    source:
      "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_minimax_h3_t2v.json",
    model: "minimax-h3",
    media: {
      kind: "video",
      w: 720,
      h: 400,
      src: "/explore/examples/minimax-h3-t2v.mp4",
      poster: "/explore/examples/minimax-h3-t2v.webp",
    },
  },
  {
    title: "HunyuanVideo 1.5",
    description: "",
    href: "/video?preset=hunyuan15-t2v",
    credit: "HunyuanVideo 1.5 workflow example · Comfy (MIT)",
    source:
      "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_hunyuan_video_1.5_720p_t2v.json",
    model: "hunyuan15",
    media: {
      kind: "video",
      w: 720,
      h: 406,
      src: "/explore/examples/hunyuan15-t2v.mp4",
      poster: "/explore/examples/hunyuan15-t2v.webp",
    },
  },
  {
    title: "LTX 2.3",
    description: "",
    href: "/video?preset=ltx23-t2v",
    credit: "LTX 2.3 workflow example · Comfy (MIT)",
    source:
      "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_3_t2v.json",
    model: "ltx23",
    media: {
      kind: "video",
      w: 720,
      h: 396,
      src: "/explore/examples/ltx23-t2v.mp4",
      poster: "/explore/examples/ltx23-t2v.webp",
    },
  },
  {
    title: "FastH3",
    description: "",
    href: "/video?preset=fasth3-t2v",
    credit: "FastH3 workflow example · Comfy (MIT)",
    source:
      "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_fastvideo_fasth3_t2v.json",
    model: "fasth3",
    media: {
      kind: "video",
      w: 640,
      h: 640,
      src: "/explore/examples/fasth3-t2v.mp4",
      poster: "/explore/examples/fasth3-t2v.webp",
    },
  },
] satisfies MediaItem[];

/** MODEL_DEMOS + COMFY_CREATIONS, deduplicated by media src. */
export const EXPLORE_MEDIA: MediaItem[] = (() => {
  const seen = new Set<string>();
  return [...MODEL_DEMOS, ...COMFY_CREATIONS].filter((item) => {
    if (seen.has(item.media.src)) return false;
    seen.add(item.media.src);
    return true;
  });
})();
