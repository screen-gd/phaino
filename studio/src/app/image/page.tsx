import { ToolLayout, type ToolStep } from "@/components/ToolLayout";

const STEPS: ToolStep[] = [
  {
    title: "Describe the image",
    body: "Write a prompt and add a reference so the same character shows up in every shot.",
  },
  {
    title: "Pick a model and style",
    body: "FLUX.2 is Open and runs free on your GPU. FLUX 3, Nano Banana Pro and GPT Image 2 are Partner models.",
  },
  {
    title: "Generate, then animate",
    body: "Upscale a keeper or send it to Video as a first frame. Every image opens as a workflow.",
  },
];

export default function ImagePage() {
  return <ToolLayout title="Image" icon="image" steps={STEPS} />;
}
