export const SECTIONS: readonly {
  href: string;
  label: string;
  group: "core" | "studio";
  badge?: "New" | "Soon";
}[] = [
  { href: "/", label: "Explore", group: "core" },
  { href: "/image", label: "Image", group: "core" },
  { href: "/video", label: "Video", group: "core" },
  { href: "/library", label: "Library", group: "core" },
  { href: "/audio", label: "Audio", group: "core", badge: "Soon" },
  { href: "/mcp", label: "MCP", group: "core", badge: "Soon" },
  { href: "/developers", label: "API", group: "core", badge: "Soon" },
  { href: "/camera", label: "Camera moves", group: "studio", badge: "New" },
  { href: "/effects", label: "Effects", group: "studio", badge: "Soon" },
  { href: "/characters", label: "Characters", group: "studio", badge: "Soon" },
  { href: "/avatars", label: "Avatars", group: "studio", badge: "Soon" },
  { href: "/edit", label: "Edit", group: "studio", badge: "Soon" },
  { href: "/workflows", label: "Workflows", group: "studio" },
  { href: "/community", label: "Community", group: "studio" },
  { href: "/editor", label: "Editor", group: "studio", badge: "New" },
];
