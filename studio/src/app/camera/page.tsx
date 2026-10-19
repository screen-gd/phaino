import { ToolLayout, type ToolStep } from "@/components/ToolLayout";

const STEPS: ToolStep[] = [
  {
    title: "Pick a move",
    body: "Choose one of 7 camera moves. Each sets its own angle and duration.",
  },
  {
    title: "Add a first frame and prompt",
    body: "Drop a still, describe the shot, pick an Open or Partner model.",
  },
  {
    title: "Generate",
    body: "Open models run free on your GPU; Partner models use Comfy credits. Every shot opens as a workflow.",
  },
];

export default function CameraPage() {
  return <ToolLayout title="Camera moves" icon="camera" steps={STEPS} />;
}
