/** Brand logo per picker family, for models without a preview render. */
const LOGOS: Record<string, string> = {
  Kling: "kling.svg",
  Seedance: "bytedance.svg",
  Seedream: "bytedance.svg",
  Veo: "google.svg",
  Gemini: "gemini.svg",
  "Nano Banana": "nanobanana.svg",
  HappyHorse: "happyhorse.svg",
  Wan: "alibaba.svg",
  Qwen: "qwen.svg",
  Hunyuan: "hunyuan.svg",
  Pika: "pika.svg",
  Runway: "runway.svg",
  FLUX: "bfl.svg",
  Grok: "grok.svg",
  Ray: "luma.svg",
  "P-Video": "prunaai.svg",
  FlashVSR: "wavespeed.svg",
  Bria: "briaai.svg",
  "GPT Image": "openai.svg",
  Ideogram: "ideogram.svg",
  Recraft: "recraft.svg",
  Krea: "krea.svg",
  MiniMax: "minimax.svg",
  LTX: "lightricks.svg",
  Moonvalley: "moonvalley.png",
  Genjutsu: "higgsfield.png",
  VEED: "veed.svg",
  Crystal: "clarity.svg",
  Freepik: "freepik.svg",
  SwitchX: "beeble.png",
  HeyGen: "heygen.ico",
};

export function brandLogo(family: string | undefined): string | undefined {
  const key = family ? LOGOS[family] : undefined;
  return key ? `/logos/${key}` : undefined;
}
