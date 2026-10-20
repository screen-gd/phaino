export type ExploreMedia = { src: string; poster: string; kind?: "video" | "image" };

type ModelDemo = {
  title: string;
  description: string;
  href: string;
  credit: string;
  source: string;
  media: ExploreMedia;
};

export const MODEL_DEMOS = [
  {
    title: "Camera moves",
    description: "Explore 7 camera moves on LTX 2.5",
    href: "/camera",
    credit: "LTX 2.5 model demo · Comfy",
    source: "https://comfy.org/ltx-2.5/",
    media: { src: "https://media.comfy.org/website/ltx-2.5/card-1.webm", poster: "https://media.comfy.org/website/ltx-2.5/card-1.webp" },
  },
  {
    title: "LTX 2.5",
    description: "Turn a still into a moving shot",
    href: "/video?preset=ltx25-i2v",
    credit: "LTX 2.5 model demo · Comfy",
    source: "https://comfy.org/ltx-2.5/",
    media: { src: "https://media.comfy.org/website/ltx-2.5/card-2.webm", poster: "https://media.comfy.org/website/ltx-2.5/card-2.webp" },
  },
  {
    title: "Wan 2.2",
    description: "Image to video with an open model",
    href: "/video?preset=wan22-i2v",
    credit: "Wan 2.2 workflow example · Comfy (MIT)",
    source: "https://docs.comfy.org/tutorials/video/wan/wan2_2",
    media: { src: "https://raw.githubusercontent.com/Comfy-Org/workflow_templates/main/output/video_wan2_2_14B_i2v.mp4", poster: "/explore/examples/wan22.webp" },
  },
  {
    title: "LTX 2.5 text to video",
    description: "Write a prompt, get a clip",
    href: "/video?preset=ltx25-i2v",
    credit: "LTX 2.5 workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_5_t2v.json",
    media: { src: "/explore/examples/ltx25-t2v.mp4", poster: "/explore/examples/ltx25-t2v.webp" },
  },
  {
    title: "LTX 2.5 first and last frame",
    description: "Anchor both ends of the shot",
    href: "/video?preset=ltx25-i2v",
    credit: "LTX 2.5 workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_5_flf2v.json",
    media: { src: "/explore/examples/ltx25-flf2v.mp4", poster: "/explore/examples/ltx25-flf2v.webp" },
  },
  {
    title: "LTX 2.5 guided video",
    description: "Image to video with depth guidance",
    href: "/video?preset=ltx25-i2v",
    credit: "LTX 2.5 workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/video_ltx2_5_dfr_i2v.json",
    media: { src: "/explore/examples/ltx25-dfr-i2v.mp4", poster: "/explore/examples/ltx25-dfr-i2v.webp" },
  },
  {
    title: "Qwen Image",
    description: "Text to image with the open Qwen model",
    href: "/image?preset=qwen-image",
    credit: "Qwen Image workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_qwen_image.json",
    media: { kind: "image", src: "/explore/examples/qwen-image.webp", poster: "/explore/examples/qwen-image.webp" },
  },
  {
    title: "Qwen Image styles",
    description: "Stylised output from the same model",
    href: "/image?preset=qwen-image",
    credit: "Qwen Image LoRA workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/template_sugar_coated_gummy_style_qwen.json",
    media: { kind: "image", src: "/explore/examples/qwen-gummy.webp", poster: "/explore/examples/qwen-gummy.webp" },
  },
  {
    title: "FLUX.2 Klein",
    description: "Text to image with the open FLUX model",
    href: "/image?preset=flux2-klein",
    credit: "FLUX.2 Klein workflow example · Comfy (MIT)",
    source: "https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_flux2_klein_text_to_image.json",
    media: { kind: "image", src: "/explore/examples/flux2-klein.webp", poster: "/explore/examples/flux2-klein.webp" },
  },
] satisfies ModelDemo[];

export const COMFY_SHOWCASE_URL = "https://comfy.org/ltx-2.5/";

type Creation = { title: string; source: string; media: ExploreMedia };

export const COMFY_CREATIONS = [
  {
    title: "LTX 2.5 portrait study",
    source: COMFY_SHOWCASE_URL,
    media: { src: "https://media.comfy.org/website/ltx-2.5/card-3.webm", poster: "https://media.comfy.org/website/ltx-2.5/card-3.webp" },
  },
  {
    title: "LTX 2.5 mountain flight",
    source: COMFY_SHOWCASE_URL,
    media: { src: "https://media.comfy.org/website/ltx-2.5/card-4.webm", poster: "https://media.comfy.org/website/ltx-2.5/card-4.webp" },
  },
  {
    title: "LTX 2.5 astronaut under the aurora",
    source: COMFY_SHOWCASE_URL,
    media: { src: "https://media.comfy.org/website/ltx-2.5/card-5.webm", poster: "https://media.comfy.org/website/ltx-2.5/card-5.webp" },
  },
  {
    title: "LTX 2.5 rider above the clouds",
    source: COMFY_SHOWCASE_URL,
    media: { src: "https://media.comfy.org/website/ltx-2.5/card-6.webm", poster: "https://media.comfy.org/website/ltx-2.5/card-6.webp" },
  },
] satisfies Creation[];
