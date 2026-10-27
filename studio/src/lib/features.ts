import type { IconName } from "@/components/icons";

export type FeatureStatus = "live" | "new" | "soon";
export type FeatureGroup = "create" | "primary" | "roadmap";

export type Feature = {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: IconName;
  status: FeatureStatus;
  group: FeatureGroup;
};

/** The app's feature directory: nav, footer, home tiles and /roadmap. */
export const FEATURES = [
  {
    id: "image",
    label: "Image",
    href: "/image",
    description: "Generate images from a prompt",
    icon: "image",
    status: "live",
    group: "create",
  },
  {
    id: "video",
    label: "Video",
    href: "/video",
    description: "Image or text to video",
    icon: "video",
    status: "live",
    group: "create",
  },
  {
    id: "camera",
    label: "Camera moves",
    href: "/camera",
    description: "7 cinematic moves",
    icon: "camera",
    status: "new",
    group: "create",
  },
  {
    id: "edit",
    label: "Edit video",
    href: "/edit",
    description: "Upscale, reframe, relight",
    icon: "edit",
    status: "new",
    group: "create",
  },
  {
    id: "library",
    label: "Library",
    href: "/library",
    description: "Your generated shots",
    icon: "frame",
    status: "live",
    group: "create",
  },
  {
    id: "editor",
    label: "Editor",
    href: "/editor",
    description: "Cut, titles and music",
    icon: "export",
    status: "live",
    group: "primary",
  },
  {
    id: "workflows",
    label: "Workflows",
    href: "/workflows",
    description: "Open any shot as a workflow",
    icon: "workflows",
    status: "live",
    group: "primary",
  },
  {
    id: "showcase",
    label: "Showcase",
    href: "/showcase",
    description: "Made with Comfy templates",
    icon: "community",
    status: "live",
    group: "primary",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    href: "/roadmap",
    description: "What is next",
    icon: "clock",
    status: "live",
    group: "primary",
  },
  {
    id: "audio",
    label: "Audio",
    href: "/audio",
    description: "Music and sound effects",
    icon: "audio",
    status: "soon",
    group: "roadmap",
  },
  {
    id: "mcp",
    label: "MCP",
    href: "/mcp",
    description: "Generate from an MCP client",
    icon: "fork",
    status: "soon",
    group: "roadmap",
  },
  {
    id: "api",
    label: "API",
    href: "/developers",
    description: "REST access to presets and jobs",
    icon: "workflows",
    status: "soon",
    group: "roadmap",
  },
  {
    id: "effects",
    label: "Effects",
    href: "/effects",
    description: "One-click VFX",
    icon: "effects",
    status: "soon",
    group: "roadmap",
  },
  {
    id: "characters",
    label: "Characters",
    href: "/characters",
    description: "Consistent characters across shots",
    icon: "characters",
    status: "soon",
    group: "roadmap",
  },
  {
    id: "avatars",
    label: "Avatars",
    href: "/avatars",
    description: "Lipsync",
    icon: "avatars",
    status: "soon",
    group: "roadmap",
  },
] as const satisfies readonly Feature[];

export type FeatureId = (typeof FEATURES)[number]["id"];

export function featuresIn(group: FeatureGroup) {
  return FEATURES.filter((f) => f.group === group);
}

export function featureById(id: FeatureId) {
  return FEATURES.find((f) => f.id === id);
}
