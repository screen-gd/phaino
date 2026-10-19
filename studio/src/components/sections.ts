import type { IconName } from "./icons";

export const SECTIONS = [
  { href: "/", label: "Explore", icon: "explore" },
  { href: "/camera", label: "Camera moves", icon: "camera" },
  { href: "/image", label: "Image", icon: "image" },
  { href: "/workflows", label: "Workflows", icon: "workflows" },
  { href: "/community", label: "Community", icon: "community" },
  { href: "/export", label: "Export", icon: "export" },
] as const satisfies readonly { href: string; label: string; icon: IconName }[];
