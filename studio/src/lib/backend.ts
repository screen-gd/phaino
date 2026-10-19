export const BACKENDS = ["local", "cloud"] as const;
export type Backend = (typeof BACKENDS)[number];

export const BACKEND_LABELS: Record<Backend, string> = {
  local: "Local GPU",
  cloud: "Comfy Cloud",
};
