import { featureById, type FeatureStatus } from "@/lib/features";

export type NavSection = {
  href: string;
  label: string;
  group: "core" | "studio";
  /** Feature id when the entry comes from the feature directory. */
  id?: string;
  status?: FeatureStatus;
};

type SectionSeed = Omit<NavSection, "status">;

// Soon entries stay visible in the header but go to /roadmap, not the stubs.
const NAV: readonly SectionSeed[] = [
  { href: "/", label: "Explore", group: "core" },
  { href: "/image", label: "Image", group: "core", id: "image" },
  { href: "/video", label: "Video", group: "core", id: "video" },
  { href: "/library", label: "Library", group: "core", id: "library" },
  { href: "/roadmap", label: "Audio", group: "core", id: "audio" },
  { href: "/roadmap", label: "MCP", group: "core", id: "mcp" },
  { href: "/roadmap", label: "API", group: "core", id: "api" },
  { href: "/camera", label: "Camera moves", group: "studio", id: "camera" },
  { href: "/roadmap", label: "Effects", group: "studio", id: "effects" },
  { href: "/roadmap", label: "Characters", group: "studio", id: "characters" },
  { href: "/roadmap", label: "Avatars", group: "studio", id: "avatars" },
  { href: "/edit", label: "Edit", group: "studio", id: "edit" },
  { href: "/workflows", label: "Workflows", group: "studio", id: "workflows" },
  { href: "/showcase", label: "Showcase", group: "studio", id: "showcase" },
  { href: "/editor", label: "Editor", group: "studio", id: "editor" },
];

export const SECTIONS: readonly NavSection[] = NAV.map((s) => ({
  ...s,
  status: s.id ? featureById(s.id)?.status : undefined,
}));
